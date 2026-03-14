import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBalanceByWallet, spendBalance } from "../api/web3ads.js";
import { createX402Client } from "../x402/client.js";

export function registerPayX402Tool(server: McpServer) {
  server.tool(
    "web3ads_pay_x402",
    "Spend the user's web3ads ad earnings to call an x402-protected API. " +
      "The platform wallet pays on-chain, and the cost is deducted from the user's ad balance.",
    {
      walletAddress: z
        .string()
        .describe("User's wallet address (ad balance will be debited)"),
      url: z.string().url().describe("The x402-protected API URL to call"),
      method: z
        .enum(["GET", "POST", "PUT", "DELETE"])
        .optional()
        .describe('HTTP method (default: "POST")'),
      body: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Request body to send (JSON object)"),
      maxCost: z
        .number()
        .positive()
        .optional()
        .describe(
          "Maximum USDC to spend on this call (safety cap, default: 0.10)",
        ),
    },
    async ({ walletAddress, url, method, body, maxCost }) => {
      const costCap = maxCost ?? 0.1;
      const httpMethod = (method ?? "POST").toLowerCase();

      try {
        // 1. Check user's available balance
        const balance = await getBalanceByWallet(walletAddress);
        const available = balance.total.pending;

        if (available <= 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No spendable balance for ${walletAddress}. The user needs to earn more from viewing ads first.`,
              },
            ],
            isError: true,
          };
        }

        if (available < costCap) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `Insufficient balance. Available: $${available.toFixed(4)} USDC, ` +
                  `but maxCost is $${costCap.toFixed(4)}. ` +
                  `Lower maxCost or wait for more ad earnings.`,
              },
            ],
            isError: true,
          };
        }

        // 2. Make the x402 call using the platform wallet
        const { client } = await createX402Client();

        const response = await client.request({
          url,
          method: httpMethod,
          data: body,
          headers: { "Content-Type": "application/json" },
        });

        // 3. Determine actual cost from x402 response headers
        // x402 responses include payment info; for now use a heuristic
        // based on common pricing ($0.001 - $0.05 per call)
        const actualCost = parseX402Cost(response) ?? 0.01;

        if (actualCost > costCap) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  `x402 call succeeded but cost ($${actualCost.toFixed(4)}) exceeds ` +
                  `your maxCost cap ($${costCap.toFixed(4)}). Deduction skipped.`,
              },
            ],
            isError: true,
          };
        }

        // 4. Debit the user's ad balance
        const spend = await spendBalance({
          walletAddress,
          amount: actualCost,
          description: `x402: ${new URL(url).pathname}`,
        });

        // 5. Return the API response + cost summary
        const responseData =
          typeof response.data === "string"
            ? response.data
            : JSON.stringify(response.data, null, 2);

        const summary = [
          `x402 call successful!`,
          `  URL: ${url}`,
          `  Cost: $${actualCost.toFixed(4)} USDC (deducted from ad earnings)`,
          `  Remaining balance: $${spend.newBalance.toFixed(4)} USDC`,
          ``,
          `Response:`,
          responseData,
        ];

        return {
          content: [{ type: "text" as const, text: summary.join("\n") }],
        };
      } catch (err: any) {
        // Handle 402 errors that weren't auto-resolved (insufficient platform USDC, etc.)
        if (err.response?.status === 402) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  "x402 payment failed. The platform wallet may not have enough USDC on Base Sepolia. " +
                  "Contact the platform admin.",
              },
            ],
            isError: true,
          };
        }

        const message =
          err.response?.data?.error ||
          err.response?.data?.message ||
          err.message ||
          "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `x402 call failed: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

/** Extract cost from x402 response headers if available */
function parseX402Cost(response: any): number | null {
  // x402 facilitators may include payment receipt info in headers
  const paymentReceipt =
    response.headers?.["x-payment-receipt"] ||
    response.headers?.["x-payment-amount"];

  if (paymentReceipt) {
    const parsed = parseFloat(paymentReceipt);
    if (!isNaN(parsed)) return parsed;
  }

  // Fallback: check response data for cost info
  if (response.data?.payment?.amount) {
    return parseFloat(response.data.payment.amount);
  }

  return null;
}
