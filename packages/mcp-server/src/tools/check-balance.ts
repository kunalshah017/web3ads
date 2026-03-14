import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getBalanceByWallet, getBalanceByCommitment } from "../api/web3ads.js";

export function registerCheckBalanceTool(server: McpServer) {
  server.tool(
    "web3ads_check_balance",
    "Check a user's web3ads ad earnings balance. Provide either a wallet address or a semaphore commitment.",
    {
      walletAddress: z
        .string()
        .optional()
        .describe("Ethereum wallet address (e.g. 0x...)"),
      commitment: z
        .string()
        .optional()
        .describe("Semaphore identity commitment (viewer only)"),
    },
    async ({ walletAddress, commitment }) => {
      if (!walletAddress && !commitment) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Provide either walletAddress or commitment.",
            },
          ],
          isError: true,
        };
      }

      try {
        if (walletAddress) {
          const data = await getBalanceByWallet(walletAddress);
          const summary = [
            `Balance for ${walletAddress}:`,
            `  Spendable: $${data.total.pending.toFixed(4)} USDC`,
            `  Already claimed: $${data.total.claimed.toFixed(4)} USDC`,
            `  Lifetime earnings: $${data.total.total.toFixed(4)} USDC`,
          ];

          if (data.publisher) {
            summary.push(
              `  Publisher earnings: $${data.publisher.pending.toFixed(4)} pending`,
            );
          }
          if (data.viewer) {
            summary.push(
              `  Viewer earnings: $${data.viewer.pending.toFixed(4)} pending`,
            );
          }

          summary.push(
            `  Can spend via x402: ${data.total.pending > 0 ? "Yes" : "No (zero balance)"}`,
          );

          return {
            content: [{ type: "text" as const, text: summary.join("\n") }],
          };
        }

        // Commitment-based lookup
        const data = await getBalanceByCommitment(commitment!);

        if (!data.found) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No viewer found for commitment ${commitment}. The user may not have registered yet.`,
              },
            ],
          };
        }

        const summary = [
          `Viewer balance (by commitment):`,
          `  Spendable: $${Number(data.balance).toFixed(4)} USDC`,
          `  Lifetime earnings: $${Number(data.totalEarnings).toFixed(4)} USDC`,
          `  Total ads viewed: ${data.totalAdsViewed}`,
          `  Can spend via x402: ${Number(data.balance) > 0 ? "Yes" : "No (zero balance)"}`,
        ];

        return {
          content: [{ type: "text" as const, text: summary.join("\n") }],
        };
      } catch (err: any) {
        const message =
          err.response?.data?.error || err.message || "Unknown error";
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to check balance: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
