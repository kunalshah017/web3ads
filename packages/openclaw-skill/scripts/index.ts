#!/usr/bin/env npx tsx
/**
 * Web3Ads OpenClaw Skill
 *
 * Enables OpenClaw AI agents to:
 * 1. Check Web3Ads earnings balance
 * 2. Create/fund ad campaigns using x402 payments
 * 3. Pay for any x402 API using Web3Ads earnings
 *
 * Usage:
 *   npx tsx scripts/index.ts <tool_name> '<json_input>'
 *
 * Example:
 *   npx tsx scripts/index.ts web3ads_check_balance '{"wallet_address": "0x..."}'
 */

import dotenv from "dotenv";
dotenv.config();

// Configuration
const API_URL = process.env.WEB3ADS_API_URL || "https://api.web3ads.wtf";
const WALLET_ADDRESS = process.env.WEB3ADS_WALLET_ADDRESS || "";
const ENABLE_EXECUTION = process.env.WEB3ADS_ENABLE_EXECUTION === "true";
const MAX_USD_PER_CALL = parseFloat(
  process.env.WEB3ADS_MAX_USD_PER_CALL || "1.00",
);
const MAX_USD_PER_DAY = parseFloat(
  process.env.WEB3ADS_MAX_USD_PER_DAY || "10.00",
);

// Budget tracking (in-memory, resets on restart)
let dailySpent = 0;
const dailyResetTime = new Date().setHours(0, 0, 0, 0);

// Types
interface ToolResult {
  ok: boolean;
  data?: unknown;
  error?: string;
  billing?: {
    estimated_cost_usd: number;
    daily_spent_usd: number;
    daily_limit_usd: number;
  };
  meta?: {
    latency_ms: number;
    tool: string;
    timestamp: string;
  };
}

interface BalanceResponse {
  publisher: { pending: number; claimed: number; total: number } | null;
  viewer: { pending: number; claimed: number; total: number } | null;
  total: { pending: number; claimed: number; total: number };
  canWithdraw: boolean;
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

// Tool definitions
const tools: Record<
  string,
  {
    description: string;
    requiresExecution: boolean;
    handler: (input: Record<string, unknown>) => Promise<ToolResult>;
  }
> = {
  // ============== READ-ONLY TOOLS ==============

  web3ads_check_balance: {
    description: "Check Web3Ads earnings balance for a wallet address",
    requiresExecution: false,
    handler: async (input) => {
      const start = Date.now();
      const walletAddress = (input.wallet_address as string) || WALLET_ADDRESS;

      if (!walletAddress) {
        return { ok: false, error: "wallet_address is required" };
      }

      try {
        const response = await fetch(
          `${API_URL}/api/rewards/balance?walletAddress=${walletAddress}`,
        );
        const data = (await response.json()) as BalanceResponse;

        return {
          ok: true,
          data: {
            wallet_address: walletAddress,
            balance_eth: data.total.pending,
            balance_usd: Number((data.total.pending * 2000).toFixed(2)),
            can_withdraw: data.canWithdraw,
            breakdown: {
              from_publishing: data.publisher?.pending || 0,
              from_viewing: data.viewer?.pending || 0,
              total_claimed: data.total.claimed,
              total_earned: data.total.total,
            },
          },
          billing: {
            estimated_cost_usd: 0,
            daily_spent_usd: dailySpent,
            daily_limit_usd: MAX_USD_PER_DAY,
          },
          meta: {
            latency_ms: Date.now() - start,
            tool: "web3ads_check_balance",
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        return { ok: false, error: `Failed to fetch balance: ${error}` };
      }
    },
  },

  web3ads_get_earnings: {
    description:
      "Get detailed earnings breakdown from viewing and publishing ads",
    requiresExecution: false,
    handler: async (input) => {
      const start = Date.now();
      const walletAddress = (input.wallet_address as string) || WALLET_ADDRESS;

      if (!walletAddress) {
        return { ok: false, error: "wallet_address is required" };
      }

      try {
        const response = await fetch(
          `${API_URL}/api/rewards/balance?walletAddress=${walletAddress}`,
        );
        const data = (await response.json()) as BalanceResponse;

        return {
          ok: true,
          data: {
            summary: {
              total_earned_eth: data.total.total,
              total_earned_usd: Number((data.total.total * 2000).toFixed(2)),
              pending_eth: data.total.pending,
              pending_usd: Number((data.total.pending * 2000).toFixed(2)),
              claimed_eth: data.total.claimed,
              claimed_usd: Number((data.total.claimed * 2000).toFixed(2)),
            },
            publisher: data.publisher
              ? {
                  role: "Publisher",
                  description: "Earnings from hosting ads on your website/app",
                  pending_eth: data.publisher.pending,
                  claimed_eth: data.publisher.claimed,
                  total_eth: data.publisher.total,
                }
              : null,
            viewer: data.viewer
              ? {
                  role: "Viewer",
                  description:
                    "Earnings from viewing ads with Web3Ads extension",
                  pending_eth: data.viewer.pending,
                  claimed_eth: data.viewer.claimed,
                  total_eth: data.viewer.total,
                }
              : null,
            network: "Base Sepolia (Testnet)",
            currency: "ETH",
          },
          billing: {
            estimated_cost_usd: 0,
            daily_spent_usd: dailySpent,
            daily_limit_usd: MAX_USD_PER_DAY,
          },
          meta: {
            latency_ms: Date.now() - start,
            tool: "web3ads_get_earnings",
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        return { ok: false, error: `Failed to fetch earnings: ${error}` };
      }
    },
  },

  web3ads_platform_info: {
    description: "Get Web3Ads platform information and pricing",
    requiresExecution: false,
    handler: async () => {
      const start = Date.now();
      return {
        ok: true,
        data: {
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
            "Use ad earnings to pay for any x402 API",
          ],
          pricing: {
            demo: {
              note: "500x inflated for hackathon demo",
              banner_cpm: { eth: 0.5, usd: 1000 },
              square_cpm: { eth: 0.75, usd: 1500 },
              sidebar_cpm: { eth: 1.0, usd: 2000 },
              interstitial_cpm: { eth: 2.0, usd: 4000 },
            },
            revenue_share: {
              publisher: "50%",
              viewer: "20%",
              platform: "30%",
            },
          },
          contracts: {
            web3ads_core_v2: "0xff7DB767900a8151a1D55b3cC4C72Eb0DA482d1F",
            forwarder: "0x8Bc2D17889EF9d04AA620e7984D7E7f74305215E",
            network: "Base Sepolia (Chain ID: 84532)",
          },
          links: {
            website: "https://web3ads.wtf",
            github: "https://github.com/web3ads",
            x402_info: "https://x402.org",
          },
        },
        billing: {
          estimated_cost_usd: 0,
          daily_spent_usd: dailySpent,
          daily_limit_usd: MAX_USD_PER_DAY,
        },
        meta: {
          latency_ms: Date.now() - start,
          tool: "web3ads_platform_info",
          timestamp: new Date().toISOString(),
        },
      };
    },
  },

  web3ads_payment_info: {
    description: "Get x402 payment protocol information",
    requiresExecution: false,
    handler: async (input) => {
      const start = Date.now();
      const walletAddress = (input.wallet_address as string) || WALLET_ADDRESS;

      try {
        const url = walletAddress
          ? `${API_URL}/api/campaigns/payment-info?walletAddress=${walletAddress}`
          : `${API_URL}/api/campaigns/payment-info`;

        const response = await fetch(url);
        const data = await response.json();

        return {
          ok: true,
          data: {
            ...data,
            description:
              "Web3Ads implements x402 payment protocol. Pay for APIs using your ad earnings!",
          },
          billing: {
            estimated_cost_usd: 0,
            daily_spent_usd: dailySpent,
            daily_limit_usd: MAX_USD_PER_DAY,
          },
          meta: {
            latency_ms: Date.now() - start,
            tool: "web3ads_payment_info",
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        return { ok: false, error: `Failed to fetch payment info: ${error}` };
      }
    },
  },

  web3ads_list_campaigns: {
    description: "List all campaigns for a wallet address",
    requiresExecution: false,
    handler: async (input) => {
      const start = Date.now();
      const walletAddress = (input.wallet_address as string) || WALLET_ADDRESS;

      if (!walletAddress) {
        return { ok: false, error: "wallet_address is required" };
      }

      try {
        const response = await fetch(
          `${API_URL}/api/campaigns?walletAddress=${walletAddress}`,
        );
        const data = await response.json();

        return {
          ok: true,
          data,
          billing: {
            estimated_cost_usd: 0,
            daily_spent_usd: dailySpent,
            daily_limit_usd: MAX_USD_PER_DAY,
          },
          meta: {
            latency_ms: Date.now() - start,
            tool: "web3ads_list_campaigns",
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        return { ok: false, error: `Failed to fetch campaigns: ${error}` };
      }
    },
  },

  web3ads_budget_status: {
    description: "Check current budget usage for this skill",
    requiresExecution: false,
    handler: async () => {
      const start = Date.now();
      return {
        ok: true,
        data: {
          daily_spent_usd: dailySpent,
          daily_limit_usd: MAX_USD_PER_DAY,
          daily_remaining_usd: MAX_USD_PER_DAY - dailySpent,
          per_call_limit_usd: MAX_USD_PER_CALL,
          execution_enabled: ENABLE_EXECUTION,
          wallet_configured: !!WALLET_ADDRESS,
        },
        billing: {
          estimated_cost_usd: 0,
          daily_spent_usd: dailySpent,
          daily_limit_usd: MAX_USD_PER_DAY,
        },
        meta: {
          latency_ms: Date.now() - start,
          tool: "web3ads_budget_status",
          timestamp: new Date().toISOString(),
        },
      };
    },
  },

  // ============== EXECUTION TOOLS ==============

  web3ads_create_campaign: {
    description:
      "Create and fund an ad campaign using Web3Ads balance (x402 payment)",
    requiresExecution: true,
    handler: async (input) => {
      const start = Date.now();

      if (!ENABLE_EXECUTION) {
        return {
          ok: false,
          error: "Execution not enabled. Set WEB3ADS_ENABLE_EXECUTION=true",
        };
      }

      const walletAddress = (input.wallet_address as string) || WALLET_ADDRESS;
      if (!walletAddress) {
        return { ok: false, error: "wallet_address is required" };
      }

      const {
        name,
        description,
        ad_type,
        media_url,
        target_url,
        budget,
        category,
      } = input as {
        name?: string;
        description?: string;
        ad_type?: string;
        media_url?: string;
        target_url?: string;
        budget?: number;
        category?: string;
      };

      if (!name || !ad_type || !media_url || !target_url || !budget) {
        return {
          ok: false,
          error: "Required: name, ad_type, media_url, target_url, budget",
        };
      }

      // Check budget limits
      const costUsd = budget * 2000; // ETH to USD
      if (costUsd > MAX_USD_PER_CALL) {
        return {
          ok: false,
          error: `Budget ${costUsd} USD exceeds per-call limit ${MAX_USD_PER_CALL} USD`,
        };
      }
      if (dailySpent + costUsd > MAX_USD_PER_DAY) {
        return {
          ok: false,
          error: `Would exceed daily limit. Spent: ${dailySpent}, Limit: ${MAX_USD_PER_DAY}`,
        };
      }

      try {
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
            adType: ad_type,
            mediaUrl: media_url,
            targetUrl: target_url,
            budget,
            category,
          }),
        });

        const data = (await response.json()) as CampaignResponse;

        if (!response.ok) {
          return {
            ok: false,
            error: data.error || "Failed to create campaign",
          };
        }

        // Track spending
        dailySpent += costUsd;

        return {
          ok: true,
          data: {
            campaign: data.campaign,
            payment: {
              method: "web3ads-balance",
              amount_eth: budget,
              amount_usd: costUsd,
              remaining_balance: data.payment?.remainingWeb3AdsBalance,
              gasless: true,
            },
            message: data.message,
            dashboard_url: `https://web3ads.wtf/advertiser?campaign=${data.campaign?.id}`,
          },
          billing: {
            estimated_cost_usd: costUsd,
            daily_spent_usd: dailySpent,
            daily_limit_usd: MAX_USD_PER_DAY,
          },
          meta: {
            latency_ms: Date.now() - start,
            tool: "web3ads_create_campaign",
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        return { ok: false, error: `Failed to create campaign: ${error}` };
      }
    },
  },

  web3ads_pay_x402: {
    description: "Pay for any x402 API using your Web3Ads earnings (gasless)",
    requiresExecution: true,
    handler: async (input) => {
      const start = Date.now();

      if (!ENABLE_EXECUTION) {
        return {
          ok: false,
          error: "Execution not enabled. Set WEB3ADS_ENABLE_EXECUTION=true",
        };
      }

      const walletAddress = (input.wallet_address as string) || WALLET_ADDRESS;
      if (!walletAddress) {
        return { ok: false, error: "wallet_address is required" };
      }

      const { amount_eth, recipient_address, memo } = input as {
        amount_eth?: number;
        recipient_address?: string;
        memo?: string;
      };

      if (!amount_eth || !recipient_address) {
        return { ok: false, error: "Required: amount_eth, recipient_address" };
      }

      // Check budget limits
      const costUsd = amount_eth * 2000;
      if (costUsd > MAX_USD_PER_CALL) {
        return {
          ok: false,
          error: `Amount ${costUsd} USD exceeds per-call limit ${MAX_USD_PER_CALL} USD`,
        };
      }
      if (dailySpent + costUsd > MAX_USD_PER_DAY) {
        return {
          ok: false,
          error: `Would exceed daily limit. Spent: ${dailySpent}, Limit: ${MAX_USD_PER_DAY}`,
        };
      }

      try {
        const response = await fetch(`${API_URL}/api/rewards/gasless-pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress,
            recipient: recipient_address,
            amount: amount_eth,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          return {
            ok: false,
            error: (data as { error?: string }).error || "Payment failed",
          };
        }

        // Track spending
        dailySpent += costUsd;

        return {
          ok: true,
          data: {
            success: true,
            tx_hash: (data as { txHash?: string }).txHash,
            amount_eth,
            amount_usd: costUsd,
            recipient: recipient_address,
            memo,
            sources: (data as { sources?: string[] }).sources,
            explorer_url: (data as { txHash?: string }).txHash
              ? `https://sepolia.basescan.org/tx/${(data as { txHash?: string }).txHash}`
              : null,
          },
          billing: {
            estimated_cost_usd: costUsd,
            daily_spent_usd: dailySpent,
            daily_limit_usd: MAX_USD_PER_DAY,
          },
          meta: {
            latency_ms: Date.now() - start,
            tool: "web3ads_pay_x402",
            timestamp: new Date().toISOString(),
          },
        };
      } catch (error) {
        return { ok: false, error: `Payment failed: ${error}` };
      }
    },
  },
};

// Main execution
async function main() {
  const [, , toolName, inputJson] = process.argv;

  if (!toolName) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: "Usage: npx tsx scripts/index.ts <tool_name> '<json_input>'",
          available_tools: Object.keys(tools),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const tool = tools[toolName];
  if (!tool) {
    console.log(
      JSON.stringify(
        {
          ok: false,
          error: `Unknown tool: ${toolName}`,
          available_tools: Object.keys(tools),
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  let input: Record<string, unknown> = {};
  if (inputJson) {
    try {
      input = JSON.parse(inputJson);
    } catch {
      console.log(
        JSON.stringify({ ok: false, error: "Invalid JSON input" }, null, 2),
      );
      process.exit(1);
    }
  }

  const result = await tool.handler(input);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.log(JSON.stringify({ ok: false, error: String(error) }, null, 2));
  process.exit(1);
});

// Export for programmatic use
export { tools };
