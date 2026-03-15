import { Router, type IRouter } from "express";
import prisma from "../db/index.js";
import {
  withdrawViewerOnChain,
  withdrawPublisherOnChain,
  isBlockchainV2Enabled,
  getPublisherBalanceOnChainV2,
} from "../blockchain/index.js";
import { formatEther } from "viem";

const router: IRouter = Router();

// Minimum withdrawal threshold in ETH
// 1 wei for demo (essentially no minimum)
// For production: 0.0001 ETH = ~$0.20 at $2000/ETH
const MIN_WITHDRAWAL = 0.000000000000000001; // 1 wei

// Get balance for wallet address (checks both publisher and viewer balances)
router.get("/balance", async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: {
        publisher: {
          select: {
            pendingBalance: true,
            claimedBalance: true,
            totalEarnings: true,
          },
        },
        viewer: {
          select: {
            pendingBalance: true,
            claimedBalance: true,
            totalEarnings: true,
          },
        },
      },
    });

    if (!user) {
      return res.json({
        publisher: null,
        viewer: null,
        total: {
          pending: 0,
          claimed: 0,
          total: 0,
        },
      });
    }

    const publisherPending = Number(user.publisher?.pendingBalance || 0);
    const viewerPending = Number(user.viewer?.pendingBalance || 0);
    const publisherClaimed = Number(user.publisher?.claimedBalance || 0);
    const viewerClaimed = Number(user.viewer?.claimedBalance || 0);

    return res.json({
      publisher: user.publisher
        ? {
            pending: publisherPending,
            claimed: publisherClaimed,
            total: Number(user.publisher.totalEarnings),
          }
        : null,
      viewer: user.viewer
        ? {
            pending: viewerPending,
            claimed: viewerClaimed,
            total: Number(user.viewer.totalEarnings),
          }
        : null,
      total: {
        pending: publisherPending + viewerPending,
        claimed: publisherClaimed + viewerClaimed,
        total:
          Number(user.publisher?.totalEarnings || 0) +
          Number(user.viewer?.totalEarnings || 0),
      },
      canWithdraw: publisherPending + viewerPending >= MIN_WITHDRAWAL,
      minWithdrawal: MIN_WITHDRAWAL,
    });
  } catch (error) {
    console.error("Error fetching balance:", error);
    return res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// Request withdrawal (creates payout record)
router.post("/withdraw", async (req, res) => {
  try {
    const { walletAddress, amount, payoutType } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    if (!payoutType || !["publisher", "viewer", "all"].includes(payoutType)) {
      return res.status(400).json({
        error: "payoutType must be one of: publisher, viewer, all",
      });
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: {
        publisher: true,
        viewer: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let withdrawAmount = 0;
    const updates: Promise<any>[] = [];

    // Calculate withdrawal amount based on type
    if (payoutType === "publisher" || payoutType === "all") {
      if (user.publisher) {
        const publisherPending = Number(user.publisher.pendingBalance);
        if (publisherPending > 0) {
          withdrawAmount += publisherPending;
          updates.push(
            prisma.publisher.update({
              where: { id: user.publisher.id },
              data: {
                pendingBalance: 0,
                claimedBalance: { increment: publisherPending },
              },
            }),
          );
        }
      }
    }

    if (payoutType === "viewer" || payoutType === "all") {
      if (user.viewer) {
        const viewerPending = Number(user.viewer.pendingBalance);
        if (viewerPending > 0) {
          withdrawAmount += viewerPending;
          updates.push(
            prisma.viewer.update({
              where: { id: user.viewer.id },
              data: {
                pendingBalance: 0,
                claimedBalance: { increment: viewerPending },
              },
            }),
          );
        }
      }
    }

    // Override with specific amount if provided
    if (amount && parseFloat(amount) > 0) {
      withdrawAmount = Math.min(parseFloat(amount), withdrawAmount);
    }

    if (withdrawAmount < MIN_WITHDRAWAL) {
      return res.status(400).json({
        error: `Minimum withdrawal is ${MIN_WITHDRAWAL} ETH (~$0.20). Current balance: ${withdrawAmount} ETH`,
      });
    }

    // For viewer withdrawals, execute on-chain immediately
    let txHash: string | null = null;
    if ((payoutType === "viewer" || payoutType === "all") && user.viewer) {
      const commitment = user.viewer.semaphoreCommitment;
      if (commitment && isBlockchainV2Enabled()) {
        txHash = await withdrawViewerOnChain({
          commitment: commitment as `0x${string}`,
          recipient: walletAddress.toLowerCase() as `0x${string}`,
        });

        if (!txHash) {
          return res.status(500).json({
            error: "Failed to execute on-chain withdrawal. Please try again.",
          });
        }
      }
    }

    // Create payout record
    const payout = await prisma.payout.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        amount: withdrawAmount,
        payoutType,
        status: txHash ? "completed" : "pending",
        txHash: txHash || undefined,
      },
    });

    // Update balances
    await Promise.all(updates);

    return res.status(201).json({
      payout: {
        id: payout.id,
        amount: withdrawAmount,
        status: payout.status,
        txHash: txHash || null,
        createdAt: payout.createdAt,
      },
      message: txHash
        ? `Withdrawal of ${withdrawAmount} ETH completed! Tx: ${txHash}`
        : `Withdrawal of ${withdrawAmount} ETH requested. Will be processed shortly.`,
    });
  } catch (error) {
    console.error("Error requesting withdrawal:", error);
    return res.status(500).json({ error: "Failed to request withdrawal" });
  }
});

// Get payout history
router.get("/history", async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    const payouts = await prisma.payout.findMany({
      where: { walletAddress: walletAddress.toLowerCase() },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({ payouts });
  } catch (error) {
    console.error("Error fetching payout history:", error);
    return res.status(500).json({ error: "Failed to fetch payout history" });
  }
});

// Get balance by semaphore commitment (for viewers without wallet connection)
router.get("/balance-by-commitment", async (req, res) => {
  try {
    const { commitment } = req.query;

    if (!commitment || typeof commitment !== "string") {
      return res.status(400).json({ error: "commitment is required" });
    }

    const viewer = await prisma.viewer.findUnique({
      where: { semaphoreCommitment: commitment },
      select: {
        pendingBalance: true,
        claimedBalance: true,
        totalEarnings: true,
        totalAdsViewed: true,
      },
    });

    if (!viewer) {
      return res.json({
        found: false,
        balance: 0,
        totalEarnings: 0,
        totalAdsViewed: 0,
      });
    }

    return res.json({
      found: true,
      balance: viewer.pendingBalance,
      totalEarnings: viewer.totalEarnings,
      totalAdsViewed: viewer.totalAdsViewed,
      canWithdraw: Number(viewer.pendingBalance) >= MIN_WITHDRAWAL,
    });
  } catch (error) {
    console.error("Error fetching balance by commitment:", error);
    return res.status(500).json({ error: "Failed to fetch balance" });
  }
});

// Gasless payment - send ad earnings to any address without paying gas
// Supports both publisher and viewer balances
router.post("/gasless-pay", async (req, res) => {
  try {
    const { walletAddress, recipient, amount } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress is required" });
    }
    if (!recipient) {
      return res.status(400).json({ error: "recipient address is required" });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: "Valid amount is required" });
    }

    // Get user and their balances
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: {
        publisher: true,
        viewer: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate available balances
    const publisherPending = Number(user.publisher?.pendingBalance || 0);
    const viewerPending = Number(user.viewer?.pendingBalance || 0);
    const totalAvailable = publisherPending + viewerPending;

    if (amount > totalAvailable) {
      return res.status(400).json({
        error: `Insufficient balance. Available: ${totalAvailable} ETH, Requested: ${amount} ETH`,
      });
    }

    // Check if blockchain is enabled
    const blockchainEnabled = isBlockchainV2Enabled();

    // Check on-chain publisher balance (for demo purposes)
    let onChainPublisherBalance = 0n;
    if (blockchainEnabled && publisherPending > 0) {
      onChainPublisherBalance =
        (await getPublisherBalanceOnChainV2(
          walletAddress.toLowerCase() as `0x${string}`,
        )) || 0n;
      console.log(
        `[GaslessPay] On-chain publisher balance: ${formatEther(onChainPublisherBalance)} ETH (DB: ${publisherPending} ETH)`,
      );
    }

    // Demo mode: If blockchain not enabled OR on-chain balance is 0 but we have DB balance,
    // do a "demo withdrawal" that just updates the database
    const isDemoMode =
      (!blockchainEnabled && totalAvailable > 0) ||
      (blockchainEnabled && totalAvailable > 0 && onChainPublisherBalance === 0n);

    // Determine which balance(s) to use and execute withdrawal(s)
    let txHash: string | null = null;
    let remainingAmount = amount;
    const dbUpdates: Promise<unknown>[] = [];
    const sources: string[] = [];

    if (isDemoMode) {
      // DEMO MODE: Just update the database, no actual on-chain withdrawal
      console.log(
        `[GaslessPay] DEMO MODE: Simulating withdrawal for ${walletAddress} - ${amount} ETH`,
      );

      // Update publisher balance in DB
      if (publisherPending > 0 && remainingAmount > 0 && user.publisher) {
        const publisherWithdrawAmount = Math.min(
          publisherPending,
          remainingAmount,
        );
        remainingAmount -= publisherWithdrawAmount;
        sources.push(`publisher: ${publisherWithdrawAmount} ETH (demo)`);

        dbUpdates.push(
          prisma.publisher.update({
            where: { id: user.publisher.id },
            data: {
              pendingBalance: { decrement: publisherWithdrawAmount },
              claimedBalance: { increment: publisherWithdrawAmount },
            },
          }),
        );
      }

      // Update viewer balance in DB
      if (remainingAmount > 0 && viewerPending > 0 && user.viewer) {
        const viewerWithdrawAmount = Math.min(viewerPending, remainingAmount);
        remainingAmount -= viewerWithdrawAmount;
        sources.push(`viewer: ${viewerWithdrawAmount} ETH (demo)`);

        dbUpdates.push(
          prisma.viewer.update({
            where: { id: user.viewer.id },
            data: {
              pendingBalance: { decrement: viewerWithdrawAmount },
              claimedBalance: { increment: viewerWithdrawAmount },
            },
          }),
        );
      }

      // Generate demo tx hash
      txHash = `0xdemo_${Date.now().toString(16)}_${Math.random().toString(16).slice(2, 10)}`;
    } else if (!blockchainEnabled) {
      return res.status(503).json({
        error: "Blockchain integration not enabled. Please try again later.",
      });
    } else {
      // REAL MODE: Try actual on-chain withdrawal

      // Try publisher balance first (if available)
      if (publisherPending > 0 && remainingAmount > 0 && user.publisher) {
        const publisherWithdrawAmount = Math.min(
          publisherPending,
          remainingAmount,
        );

        txHash = await withdrawPublisherOnChain({
          publisher: walletAddress.toLowerCase() as `0x${string}`,
          recipient: recipient.toLowerCase() as `0x${string}`,
        });

        if (txHash) {
          remainingAmount -= publisherWithdrawAmount;
          sources.push(`publisher: ${publisherWithdrawAmount} ETH`);

          dbUpdates.push(
            prisma.publisher.update({
              where: { id: user.publisher.id },
              data: {
                pendingBalance: { decrement: publisherWithdrawAmount },
                claimedBalance: { increment: publisherWithdrawAmount },
              },
            }),
          );
        }
      }
    }

    // Check if we successfully withdrew anything
    if (!txHash || remainingAmount > 0) {
      return res.status(500).json({
        error: "Failed to execute on-chain transaction. Please try again.",
        details:
          remainingAmount > 0
            ? `Could not withdraw full amount. Missing: ${remainingAmount} ETH`
            : "Transaction failed",
        demoTip:
          "Note: For demo, make sure to view ads first to accumulate on-chain balance.",
      });
    }

    // Execute database updates
    await Promise.all(dbUpdates);

    // Create payout record
    const payout = await prisma.payout.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        amount: amount,
        payoutType: isDemoMode ? "demo" : "gasless",
        status: "completed",
        txHash: txHash,
      },
    });

    console.log(
      `[GaslessPay] ${walletAddress} sent ${amount} ETH to ${recipient} (${sources.join(", ")}) | tx: ${txHash}`,
    );

    return res.status(200).json({
      success: true,
      txHash: txHash,
      amount: amount,
      recipient: recipient,
      sources: sources,
      demoMode: isDemoMode,
      payout: {
        id: payout.id,
        status: payout.status,
        createdAt: payout.createdAt,
      },
      message: isDemoMode
        ? `[DEMO] Simulated withdrawal of ${amount} ETH. In production, this would be sent to ${recipient}.`
        : `Successfully sent ${amount} ETH to ${recipient}. Gas sponsored by Web3Ads!`,
    });
  } catch (error) {
    console.error("Error processing gasless payment:", error);
    return res.status(500).json({ error: "Failed to process gasless payment" });
  }
});

export default router;
