import { Router, type IRouter } from "express";
import prisma from "../db/index.js";

const router: IRouter = Router();

// Minimum withdrawal threshold in USDC
const MIN_WITHDRAWAL = 10;

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
        error: `Minimum withdrawal is ${MIN_WITHDRAWAL} USDC. Current balance: ${withdrawAmount}`,
      });
    }

    // Create payout record
    const payout = await prisma.payout.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        amount: withdrawAmount,
        payoutType,
        status: "pending",
      },
    });

    // Update balances
    await Promise.all(updates);

    return res.status(201).json({
      payout: {
        id: payout.id,
        amount: withdrawAmount,
        status: payout.status,
        createdAt: payout.createdAt,
      },
      message: `Withdrawal of ${withdrawAmount} USDC requested. Will be processed shortly.`,
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

export default router;
