import { Router, type IRouter } from "express";
import prisma from "../db/index.js";

const router: IRouter = Router();

// POST /api/x402/spend — Deduct from user's ad balance for an x402 payment
router.post("/spend", async (req, res) => {
  try {
    const { walletAddress, amount, description } = req.body;

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
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

    const viewerPending = Number(user.viewer?.pendingBalance || 0);
    const publisherPending = Number(user.publisher?.pendingBalance || 0);
    const totalAvailable = viewerPending + publisherPending;

    if (totalAvailable < amount) {
      return res.status(400).json({
        error: `Insufficient balance. Available: ${totalAvailable.toFixed(4)}, requested: ${amount.toFixed(4)}`,
      });
    }

    // Deduct from viewer balance first, then publisher
    let remaining = amount;
    const updates: Promise<any>[] = [];

    if (user.viewer && viewerPending > 0) {
      const deductFromViewer = Math.min(remaining, viewerPending);
      remaining -= deductFromViewer;
      updates.push(
        prisma.viewer.update({
          where: { id: user.viewer.id },
          data: {
            pendingBalance: { decrement: deductFromViewer },
            claimedBalance: { increment: deductFromViewer },
          },
        }),
      );
    }

    if (remaining > 0 && user.publisher && publisherPending > 0) {
      const deductFromPublisher = Math.min(remaining, publisherPending);
      remaining -= deductFromPublisher;
      updates.push(
        prisma.publisher.update({
          where: { id: user.publisher.id },
          data: {
            pendingBalance: { decrement: deductFromPublisher },
            claimedBalance: { increment: deductFromPublisher },
          },
        }),
      );
    }

    // Create payout record for tracking
    const payout = await prisma.payout.create({
      data: {
        walletAddress: walletAddress.toLowerCase(),
        amount,
        payoutType: "x402_payment",
        status: "completed",
      },
    });

    // Execute balance updates
    await Promise.all(updates);

    const newBalance = totalAvailable - amount;

    return res.json({
      success: true,
      amountSpent: amount,
      newBalance,
      payoutId: payout.id,
      description: description || "x402 payment",
    });
  } catch (error) {
    console.error("Error processing x402 spend:", error);
    return res.status(500).json({ error: "Failed to process x402 spend" });
  }
});

// GET /api/x402/history — Get x402 payment history
router.get("/history", async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    const payouts = await prisma.payout.findMany({
      where: {
        walletAddress: walletAddress.toLowerCase(),
        payoutType: "x402_payment",
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json({ payments: payouts });
  } catch (error) {
    console.error("Error fetching x402 history:", error);
    return res.status(500).json({ error: "Failed to fetch x402 history" });
  }
});

export default router;
