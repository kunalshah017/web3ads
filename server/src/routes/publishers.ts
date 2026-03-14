import { Router, type IRouter } from "express";
import prisma from "../db/index.js";

const router: IRouter = Router();

// Register as publisher
router.post("/register", async (req, res) => {
  try {
    const { walletAddress, websiteUrl } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    // Create or get user
    const user = await prisma.user.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      update: {},
      create: { walletAddress: walletAddress.toLowerCase() },
    });

    // Create or get publisher
    const publisher = await prisma.publisher.upsert({
      where: { userId: user.id },
      update: { websiteUrl },
      create: {
        userId: user.id,
        websiteUrl,
      },
    });

    return res.status(201).json({
      publisher: {
        id: publisher.id,
        walletAddress: user.walletAddress,
        websiteUrl: publisher.websiteUrl,
        isVerified: publisher.isVerified,
        createdAt: publisher.createdAt,
      },
    });
  } catch (error) {
    console.error("Error registering publisher:", error);
    return res.status(500).json({ error: "Failed to register publisher" });
  }
});

// Get publisher profile and stats
router.get("/profile", async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    const publisher = await prisma.publisher.findFirst({
      where: {
        user: {
          walletAddress: walletAddress.toLowerCase(),
        },
      },
      include: {
        user: {
          select: { walletAddress: true },
        },
      },
    });

    if (!publisher) {
      return res.status(404).json({ error: "Publisher not found" });
    }

    return res.json({
      publisher: {
        id: publisher.id,
        walletAddress: publisher.user.walletAddress,
        websiteUrl: publisher.websiteUrl,
        totalViews: publisher.totalViews,
        totalEarnings: publisher.totalEarnings,
        pendingBalance: publisher.pendingBalance,
        claimedBalance: publisher.claimedBalance,
        isVerified: publisher.isVerified,
        createdAt: publisher.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching publisher profile:", error);
    return res.status(500).json({ error: "Failed to fetch publisher profile" });
  }
});

// Get publisher earnings history
router.get("/earnings", async (req, res) => {
  try {
    const { walletAddress, period = "7d" } = req.query;

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    const publisher = await prisma.publisher.findFirst({
      where: {
        user: {
          walletAddress: walletAddress.toLowerCase(),
        },
      },
    });

    if (!publisher) {
      return res.status(404).json({ error: "Publisher not found" });
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get impressions grouped by day
    const impressions = await prisma.impression.groupBy({
      by: ["createdAt"],
      where: {
        publisherId: publisher.id,
        createdAt: { gte: startDate },
      },
      _count: true,
      _sum: {
        publisherEarning: true,
      },
    });

    // Aggregate by date
    const dailyStats: Record<string, { views: number; earnings: number }> = {};

    for (const imp of impressions) {
      const date = imp.createdAt.toISOString().split("T")[0];
      if (!dailyStats[date]) {
        dailyStats[date] = { views: 0, earnings: 0 };
      }
      dailyStats[date].views += imp._count;
      dailyStats[date].earnings += Number(imp._sum.publisherEarning || 0);
    }

    // Get total stats for period
    const totalStats = await prisma.impression.aggregate({
      where: {
        publisherId: publisher.id,
        createdAt: { gte: startDate },
      },
      _count: true,
      _sum: {
        publisherEarning: true,
      },
    });

    return res.json({
      period,
      totalViews: totalStats._count,
      totalEarnings: totalStats._sum.publisherEarning || 0,
      dailyStats: Object.entries(dailyStats)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    });
  } catch (error) {
    console.error("Error fetching publisher earnings:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch publisher earnings" });
  }
});

// Get embed code for publisher
router.get("/embed-code", async (req, res) => {
  try {
    const { walletAddress, adType = "BANNER" } = req.query;

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    const embedCode = `<!-- Web3Ads -->
<script src="https://cdn.web3ads.wtf/embed.js"></script>
<div 
  data-web3ads
  data-publisher="${walletAddress}"
  data-type="${adType}"
></div>

<!-- Or with React -->
import { Web3Ad } from '@web3ads/react';

<Web3Ad
  publisherWallet="${walletAddress}"
  type="${(adType as string).toLowerCase()}"
/>`;

    return res.json({
      embedCode,
      publisherWallet: walletAddress,
      adType,
    });
  } catch (error) {
    console.error("Error generating embed code:", error);
    return res.status(500).json({ error: "Failed to generate embed code" });
  }
});

export default router;
