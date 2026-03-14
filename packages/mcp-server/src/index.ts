#!/usr/bin/env node
/**
 * Web3Ads MCP Server
 *
 * Enables AI agents to:
 * 1. Check user's ad earnings balance
 * 2. Make payments using ad earnings (gasless)
 * 3. Get detailed earnings breakdown
 * 4. Create ad campaigns using x402 payment
 *
 * For x402/HeyElsa integration - allows agents to pay for API calls
 * using funds earned from viewing/publishing ads.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Configuration
const API_URL = process.env.WEB3ADS_API_URL || "http://localhost:3001";

// Balance response types
interface BalanceResponse {
  publisher: {
    pending: number;
    claimed: number;
    total: number;
  } | null;
  viewer: {
    pending: number;
    claimed: number;
    total: number;
  } | null;
  total: {
    pending: number;
    claimed: number;
    total: number;
  };
  canWithdraw: boolean;
}

interface PaymentResponse {
  success: boolean;
  txHash?: string;
  error?: string;
  sources?: string[];
}

interface CampaignResponse {
  campaign?: {
    id: string;
    name: string;
    budget: number;
    status: string;
    adType: string;
  };
  payment?: {
    method: string;
    amount: number;
    remainingWeb3AdsBalance?: number;
  };
  message?: string;
  error?: string;
}

// Create MCP server
const server = new McpServer({
  name: "web3ads",
  version: "1.0.0",
});

/**
 * Tool 1: Check Balance
 * Returns user's available Web3Ads earnings
 */
server.tool(
  "web3ads_check_balance",
  "Check user's Web3Ads earnings balance. Returns ETH balance from viewing and publishing ads that can be used for payments.",
  {
    walletAddress: z
      .string()
      .describe("User's Ethereum wallet address (0x...)"),
  },
  async ({ walletAddress }) => {
    try {
      const response = await fetch(
        `${API_URL}/api/rewards/balance?walletAddress=${walletAddress}`,
      );

      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to fetch balance",
                status: response.status,
              }),
            },
          ],
        };
      }

      const data = (await response.json()) as BalanceResponse;

      const result = {
        balanceETH: data.total.pending,
        balanceUSD: Number((data.total.pending * 2000).toFixed(2)), // Approximate at $2000/ETH
        canWithdraw: data.total.pending > 0,
        breakdown: {
          fromPublishing: data.publisher?.pending || 0,
          fromViewing: data.viewer?.pending || 0,
          totalClaimed: data.total.claimed,
          totalEarned: data.total.total,
        },
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Failed to connect to Web3Ads API",
              details: error instanceof Error ? error.message : "Unknown error",
            }),
          },
        ],
      };
    }
  },
);

/**
 * Tool 2: Make Payment
 * Pay for services using Web3Ads earnings (gasless)
 */
server.tool(
  "web3ads_make_payment",
  "Pay for x402 API calls or any service using Web3Ads earnings. The payment is gasless - Web3Ads covers transaction fees.",
  {
    walletAddress: z
      .string()
      .describe("User's Ethereum wallet address that has the ad earnings"),
    amountETH: z
      .number()
      .positive()
      .describe("Amount to pay in ETH (e.g., 0.001 for 0.001 ETH)"),
    recipientAddress: z
      .string()
      .describe("Recipient's Ethereum address (the service provider)"),
    memo: z
      .string()
      .optional()
      .describe("Optional memo/description for the payment"),
  },
  async ({ walletAddress, amountETH, recipientAddress, memo }) => {
    try {
      // First check balance
      const balanceResponse = await fetch(
        `${API_URL}/api/rewards/balance?walletAddress=${walletAddress}`,
      );
      const balanceData = (await balanceResponse.json()) as BalanceResponse;

      if (balanceData.total.pending < amountETH) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "Insufficient balance",
                requested: amountETH,
                available: balanceData.total.pending,
              }),
            },
          ],
        };
      }

      // Execute gasless payment
      const response = await fetch(`${API_URL}/api/rewards/gasless-pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress,
          recipient: recipientAddress,
          amount: amountETH,
        }),
      });

      const data = (await response.json()) as PaymentResponse;

      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: data.error || "Payment failed",
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              txHash: data.txHash,
              amountETH,
              amountUSD: Number((amountETH * 2000).toFixed(2)),
              recipient: recipientAddress,
              memo: memo || null,
              sources: data.sources,
              explorerUrl: data.txHash
                ? `https://sepolia.basescan.org/tx/${data.txHash}`
                : null,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Failed to process payment",
              details: error instanceof Error ? error.message : "Unknown error",
            }),
          },
        ],
      };
    }
  },
);

/**
 * Tool 3: Get Earnings Breakdown
 * Detailed view of all earnings sources
 */
server.tool(
  "web3ads_get_earnings",
  "Get detailed breakdown of user's Web3Ads earnings from viewing and publishing ads.",
  {
    walletAddress: z.string().describe("User's Ethereum wallet address"),
  },
  async ({ walletAddress }) => {
    try {
      const response = await fetch(
        `${API_URL}/api/rewards/balance?walletAddress=${walletAddress}`,
      );

      if (!response.ok) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                error: "Failed to fetch earnings",
                status: response.status,
              }),
            },
          ],
        };
      }

      const data = (await response.json()) as BalanceResponse;

      const result = {
        summary: {
          totalEarnedETH: data.total.total,
          totalEarnedUSD: Number((data.total.total * 2000).toFixed(2)),
          pendingETH: data.total.pending,
          pendingUSD: Number((data.total.pending * 2000).toFixed(2)),
          claimedETH: data.total.claimed,
          claimedUSD: Number((data.total.claimed * 2000).toFixed(2)),
        },
        publisher: data.publisher
          ? {
              role: "Publisher",
              description: "Earnings from hosting ads on your website/app",
              pendingETH: data.publisher.pending,
              claimedETH: data.publisher.claimed,
              totalETH: data.publisher.total,
            }
          : null,
        viewer: data.viewer
          ? {
              role: "Viewer",
              description: "Earnings from viewing ads with Web3Ads extension",
              pendingETH: data.viewer.pending,
              claimedETH: data.viewer.claimed,
              totalETH: data.viewer.total,
            }
          : null,
        network: "Base Sepolia (Testnet)",
        currency: "ETH",
        withdrawalMethod: "Gasless (Web3Ads pays gas fees)",
      };

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Failed to fetch earnings",
              details: error instanceof Error ? error.message : "Unknown error",
            }),
          },
        ],
      };
    }
  },
);

/**
 * Tool 4: Get Platform Info
 * Information about Web3Ads platform and pricing
 */
server.tool(
  "web3ads_platform_info",
  "Get information about Web3Ads platform, pricing, and how earnings work.",
  {},
  async () => {
    const info = {
      name: "Web3Ads",
      description:
        "Decentralized advertising platform where users earn crypto from viewing and publishing ads",
      network: "Base Sepolia (Testnet)",
      currency: "ETH (native)",
      features: [
        "Gasless payments - Web3Ads covers all transaction fees",
        "Privacy-preserving ad tracking with zkProofs",
        "Instant withdrawals to any address",
        "Compatible with x402/MCP for AI agent payments",
      ],
      pricing: {
        demo: {
          note: "500x inflated for hackathon demo",
          bannerCPM: { eth: 0.5, usd: 1000 },
          squareCPM: { eth: 0.75, usd: 1500 },
          sidebarCPM: { eth: 1.0, usd: 2000 },
          interstitialCPM: { eth: 2.0, usd: 4000 },
        },
        revenueShare: {
          publisher: "50%",
          viewer: "20%",
          platform: "30%",
        },
      },
      contracts: {
        web3AdsCoreV2: "0xff7DB767900a8151a1D55b3cC4C72Eb0DA482d1F",
        forwarder: "0x8Bc2D17889EF9d04AA620e7984D7E7f74305215E",
        network: "Base Sepolia (Chain ID: 84532)",
      },
      links: {
        website: "https://web3ads.wtf",
        explorer:
          "https://sepolia.basescan.org/address/0xff7DB767900a8151a1D55b3cC4C72Eb0DA482d1F",
      },
    };

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(info, null, 2),
        },
      ],
    };
  },
);

/**
 * Tool 5: Create Campaign with x402 Payment
 * Creates an ad campaign using Web3Ads balance (from ad earnings)
 */
server.tool(
  "web3ads_create_campaign",
  "Create an advertising campaign on Web3Ads. Pays using your Web3Ads balance from ad earnings (gasless!). Returns campaign details on success.",
  {
    walletAddress: z
      .string()
      .describe("Your wallet address that has Web3Ads earnings"),
    name: z.string().describe("Campaign name"),
    description: z.string().optional().describe("Campaign description"),
    adType: z
      .enum(["BANNER", "SQUARE", "SIDEBAR", "INTERSTITIAL"])
      .describe(
        "Ad format: BANNER (728x90), SQUARE (300x250), SIDEBAR (160x600), INTERSTITIAL (fullscreen)"
      ),
    mediaUrl: z
      .string()
      .url()
      .describe("URL to the ad image (must be publicly accessible)"),
    targetUrl: z
      .string()
      .url()
      .describe("URL users go to when clicking the ad"),
    budget: z
      .number()
      .positive()
      .describe("Campaign budget in ETH (will be paid from your Web3Ads balance)"),
    category: z
      .string()
      .optional()
      .describe("Ad category (e.g., 'tech', 'defi', 'nft')"),
  },
  async ({
    walletAddress,
    name,
    description,
    adType,
    mediaUrl,
    targetUrl,
    budget,
    category,
  }) => {
    try {
      // First check balance
      const balanceResponse = await fetch(
        `${API_URL}/api/rewards/balance?walletAddress=${walletAddress}`
      );
      const balanceData = (await balanceResponse.json()) as BalanceResponse;

      if (balanceData.total.pending < budget) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "Insufficient Web3Ads balance",
                required: budget,
                available: balanceData.total.pending,
                suggestion:
                  "Earn more by viewing ads with the Web3Ads extension or publishing ads on your site!",
              }),
            },
          ],
        };
      }

      // Create campaign with x402 payment using Web3Ads balance
      const response = await fetch(`${API_URL}/api/campaigns/create-funded`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Payment-Method": "web3ads-balance",
          "X-Payer-Address": walletAddress,
        },
        body: JSON.stringify({
          walletAddress,
          name,
          description,
          adType,
          mediaUrl,
          targetUrl,
          budget,
          category,
        }),
      });

      const data = (await response.json()) as CampaignResponse;

      if (!response.ok) {
        // Check if it's a 402 response
        if (response.status === 402) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  success: false,
                  error: "Payment required",
                  details: data,
                  suggestion:
                    "Your Web3Ads balance may be insufficient. Check balance first.",
                }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: data.error || "Failed to create campaign",
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              campaign: {
                id: data.campaign?.id,
                name: data.campaign?.name,
                status: data.campaign?.status,
                budget: data.campaign?.budget,
                adType: data.campaign?.adType,
              },
              payment: {
                method: "web3ads-balance",
                amountETH: budget,
                amountUSD: Number((budget * 2000).toFixed(2)),
                remainingBalance: data.payment?.remainingWeb3AdsBalance,
                gasless: true,
              },
              message: data.message,
              dashboardUrl: `https://web3ads.wtf/advertiser?campaign=${data.campaign?.id}`,
            }),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: "Failed to create campaign",
              details: error instanceof Error ? error.message : "Unknown error",
            }),
          },
        ],
      };
    }
  }
);

/**
 * Tool 6: Get x402 Payment Info
 * Returns information about x402 payment requirements
 */
server.tool(
  "web3ads_payment_info",
  "Get information about x402 payment protocol and your available Web3Ads balance for payments.",
  {
    walletAddress: z
      .string()
      .optional()
      .describe("Your wallet address to check available balance"),
  },
  async ({ walletAddress }) => {
    try {
      const url = walletAddress
        ? `${API_URL}/api/campaigns/payment-info?walletAddress=${walletAddress}`
        : `${API_URL}/api/campaigns/payment-info`;

      const response = await fetch(url);
      const data = (await response.json()) as Record<string, unknown>;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ...data,
                description:
                  "Web3Ads implements x402 payment protocol. You can pay for API calls using your ad earnings (gasless!) or direct ETH transfers.",
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              error: "Failed to fetch payment info",
              details: error instanceof Error ? error.message : "Unknown error",
            }),
          },
        ],
      };
    }
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Web3Ads MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
});
