/**
 * x402 Protocol Middleware for Web3Ads
 *
 * Implements HTTP 402 Payment Required using Coinbase's official x402 protocol.
 * Supports two payment methods:
 * 1. Official x402 (USDC via Coinbase facilitator) - Standard protocol
 * 2. Web3Ads balance payment (gasless, uses ad earnings) - Our unique feature
 *
 * This enables AI agents to pay for API calls using either:
 * - USDC on Base Sepolia (standard x402)
 * - Web3Ads ad earnings (no wallet needed, gasless!)
 */

import { Request, Response, NextFunction } from "express";
import { paymentMiddleware as x402PaymentMiddleware } from "x402-express";
import { createPublicClient, http, formatEther } from "viem";
import { baseSepolia } from "viem/chains";
import prisma from "../db/index.js";

// Platform wallet that receives campaign payments
const PLATFORM_WALLET =
  process.env.PLATFORM_WALLET_ADDRESS ||
  "0x8Bc2D17889EF9d04AA620e7984D7E7f74305215E";

const BASE_SEPOLIA_RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

// Create public client for reading blockchain data
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA_RPC_URL),
});

export interface X402Config {
  resourceType: "campaign" | "api-call" | "custom";
  priceETH: number | ((req: Request) => number);
  priceUSD?: number | ((req: Request) => number); // For official x402 (USDC)
  description?: string;
  acceptWeb3AdsBalance?: boolean; // Default: true
}

export interface X402PaymentInfo {
  paymentRequired: boolean;
  amount: number;
  currency: "ETH" | "USDC";
  network: "base-sepolia";
  paymentAddress: string;
  acceptsWeb3AdsBalance: boolean;
  resourceType: string;
  description: string;
}

/**
 * Verify a direct ETH payment on-chain
 */
async function verifyDirectPayment(
  txHash: `0x${string}`,
  expectedAmount: number,
  payerAddress: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });

    if (!receipt || receipt.status !== "success") {
      return { valid: false, error: "Transaction not found or failed" };
    }

    const tx = await publicClient.getTransaction({ hash: txHash });

    // Verify the transaction is to our platform wallet
    if (tx.to?.toLowerCase() !== PLATFORM_WALLET.toLowerCase()) {
      return { valid: false, error: "Payment sent to wrong address" };
    }

    // Verify the amount (allow 1% tolerance for gas fluctuations)
    const expectedWei = BigInt(Math.floor(expectedAmount * 1e18));
    const tolerance = expectedWei / 100n; // 1%
    if (tx.value < expectedWei - tolerance) {
      return {
        valid: false,
        error: `Insufficient payment. Expected: ${formatEther(expectedWei)} ETH, Got: ${formatEther(tx.value)} ETH`,
      };
    }

    // Verify sender
    if (tx.from.toLowerCase() !== payerAddress.toLowerCase()) {
      return { valid: false, error: "Transaction from different address" };
    }

    return { valid: true };
  } catch (error) {
    console.error("[x402] Error verifying payment:", error);
    return { valid: false, error: "Failed to verify transaction" };
  }
}

/**
 * Verify and deduct payment from Web3Ads balance
 */
async function verifyWeb3AdsBalancePayment(
  payerAddress: string,
  amount: number,
): Promise<{ valid: boolean; error?: string; newBalance?: number }> {
  try {
    const user = await prisma.user.findUnique({
      where: { walletAddress: payerAddress.toLowerCase() },
      include: {
        publisher: true,
        viewer: true,
      },
    });

    if (!user) {
      return { valid: false, error: "User not found" };
    }

    const publisherPending = Number(user.publisher?.pendingBalance || 0);
    const viewerPending = Number(user.viewer?.pendingBalance || 0);
    const totalAvailable = publisherPending + viewerPending;

    if (totalAvailable < amount) {
      return {
        valid: false,
        error: `Insufficient Web3Ads balance. Available: ${totalAvailable} ETH, Required: ${amount} ETH`,
      };
    }

    // Deduct from balances (prefer publisher first, then viewer)
    let remainingAmount = amount;
    const updates: Promise<unknown>[] = [];

    if (publisherPending > 0 && remainingAmount > 0 && user.publisher) {
      const deductAmount = Math.min(publisherPending, remainingAmount);
      remainingAmount -= deductAmount;
      updates.push(
        prisma.publisher.update({
          where: { id: user.publisher.id },
          data: {
            pendingBalance: { decrement: deductAmount },
            claimedBalance: { increment: deductAmount },
          },
        }),
      );
    }

    if (remainingAmount > 0 && viewerPending > 0 && user.viewer) {
      const deductAmount = Math.min(viewerPending, remainingAmount);
      remainingAmount -= deductAmount;
      updates.push(
        prisma.viewer.update({
          where: { id: user.viewer.id },
          data: {
            pendingBalance: { decrement: deductAmount },
            claimedBalance: { increment: deductAmount },
          },
        }),
      );
    }

    await Promise.all(updates);

    // Record the x402 payment
    await prisma.payout.create({
      data: {
        walletAddress: payerAddress.toLowerCase(),
        amount: amount,
        payoutType: "x402",
        status: "completed",
        txHash: `x402-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
    });

    console.log(
      `[x402] Balance payment: ${payerAddress} paid ${amount} ETH from Web3Ads balance`,
    );

    return {
      valid: true,
      newBalance: totalAvailable - amount,
    };
  } catch (error) {
    console.error("[x402] Error processing balance payment:", error);
    return { valid: false, error: "Failed to process balance payment" };
  }
}

/**
 * Create x402 middleware for a specific resource
 */
export function x402(config: X402Config) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    // Calculate price
    const price =
      typeof config.priceETH === "function"
        ? config.priceETH(req)
        : config.priceETH;

    const acceptsBalance = config.acceptWeb3AdsBalance !== false;

    // Check for payment headers
    const paymentMethod = req.headers["x-payment-method"] as string;
    const paymentProof = req.headers["x-payment-proof"] as string;
    const payerAddress = req.headers["x-payer-address"] as string;

    // If no payment info provided, return 402
    if (!paymentMethod || !payerAddress) {
      res.status(402);
      res.set({
        "WWW-Authenticate": "x402",
        "X-Payment-Address": PLATFORM_WALLET,
        "X-Payment-Amount": price.toString(),
        "X-Payment-Currency": "ETH",
        "X-Payment-Network": "base-sepolia",
        "X-Payment-Chain-Id": "84532",
        "X-Accept-Web3Ads-Balance": acceptsBalance ? "true" : "false",
        "X-Resource-Type": config.resourceType,
        "Content-Type": "application/json",
      });

      res.json({
        error: "Payment Required",
        code: "PAYMENT_REQUIRED",
        payment: {
          address: PLATFORM_WALLET,
          amount: price,
          currency: "ETH",
          network: "base-sepolia",
          chainId: 84532,
          acceptsWeb3AdsBalance: acceptsBalance,
          description:
            config.description || `Payment for ${config.resourceType}`,
        },
        instructions: {
          direct: {
            step1: `Send ${price} ETH to ${PLATFORM_WALLET} on Base Sepolia`,
            step2: "Include X-Payment-Method: direct",
            step3: "Include X-Payment-Proof: <txHash>",
            step4: "Include X-Payer-Address: <your-wallet>",
          },
          web3adsBalance: acceptsBalance
            ? {
                step1: "Check your Web3Ads balance at GET /api/rewards/balance",
                step2: "Include X-Payment-Method: web3ads-balance",
                step3: "Include X-Payer-Address: <your-wallet>",
                note: "No transaction needed - uses your ad earnings!",
              }
            : null,
        },
      });
      return;
    }

    // Verify payment based on method
    if (paymentMethod === "direct") {
      if (!paymentProof) {
        res.status(402).json({
          error: "Payment proof required",
          code: "MISSING_PAYMENT_PROOF",
          message: "Include X-Payment-Proof header with transaction hash",
        });
        return;
      }

      const verification = await verifyDirectPayment(
        paymentProof as `0x${string}`,
        price,
        payerAddress,
      );

      if (!verification.valid) {
        res.status(402).json({
          error: "Payment verification failed",
          code: "PAYMENT_VERIFICATION_FAILED",
          details: verification.error,
        });
        return;
      }

      // Payment verified - attach info to request
      (req as any).x402 = {
        verified: true,
        method: "direct",
        amount: price,
        txHash: paymentProof,
        payer: payerAddress,
      };

      console.log(
        `[x402] Direct payment verified: ${payerAddress} paid ${price} ETH | tx: ${paymentProof}`,
      );
    } else if (paymentMethod === "web3ads-balance") {
      if (!acceptsBalance) {
        res.status(402).json({
          error: "Web3Ads balance payment not accepted",
          code: "BALANCE_NOT_ACCEPTED",
          message: "This resource requires direct ETH payment",
        });
        return;
      }

      const verification = await verifyWeb3AdsBalancePayment(
        payerAddress,
        price,
      );

      if (!verification.valid) {
        res.status(402).json({
          error: "Balance payment failed",
          code: "BALANCE_PAYMENT_FAILED",
          details: verification.error,
        });
        return;
      }

      // Payment verified - attach info to request
      (req as any).x402 = {
        verified: true,
        method: "web3ads-balance",
        amount: price,
        payer: payerAddress,
        remainingBalance: verification.newBalance,
      };
    } else {
      res.status(400).json({
        error: "Invalid payment method",
        code: "INVALID_PAYMENT_METHOD",
        validMethods: acceptsBalance
          ? ["direct", "web3ads-balance"]
          : ["direct"],
      });
      return;
    }

    // Payment verified - continue to handler
    next();
  };
}

/**
 * Helper to get payment info from request
 */
export function getX402Payment(req: Request): {
  verified: boolean;
  method: "direct" | "web3ads-balance";
  amount: number;
  txHash?: string;
  payer: string;
  remainingBalance?: number;
} | null {
  return (req as any).x402 || null;
}

/**
 * Generate x402 payment info for documentation/response
 */
export function generatePaymentInfo(
  priceETH: number,
  resourceType: string,
  acceptsBalance = true,
): X402PaymentInfo {
  return {
    paymentRequired: true,
    amount: priceETH,
    currency: "ETH",
    network: "base-sepolia",
    paymentAddress: PLATFORM_WALLET,
    acceptsWeb3AdsBalance: acceptsBalance,
    resourceType,
    description: `Payment for ${resourceType}`,
  };
}

/**
 * Create official Coinbase x402-express middleware for USDC payments
 * This follows the standard x402 protocol that HeyElsa and other services use
 */
export function createOfficialX402Middleware(routes: Record<string, { price: string; description?: string }>) {
  return x402PaymentMiddleware(
    PLATFORM_WALLET as `0x${string}`,
    Object.fromEntries(
      Object.entries(routes).map(([path, config]) => [
        path,
        {
          price: config.price,
          network: "base-sepolia" as const,
          config: {
            description: config.description || `Access to ${path}`,
          },
        },
      ])
    )
  );
}

/**
 * Export the official x402 payment middleware for direct use
 * Use this for standard USDC payments via Coinbase x402 protocol
 */
export { x402PaymentMiddleware as officialX402Middleware };

/**
 * Get platform wallet address
 */
export function getPlatformWallet(): string {
  return PLATFORM_WALLET;
}

export default x402;
