import { Router, type IRouter } from "express";
import prisma from "../db/index.js";

const router: IRouter = Router();

// Register viewer with semaphore commitment
router.post("/register", async (req, res) => {
  try {
    const { walletAddress, semaphoreCommitment } = req.body;

    if (!semaphoreCommitment) {
      return res.status(400).json({ error: "semaphoreCommitment is required" });
    }

    // Check if commitment already exists
    const existingViewer = await prisma.viewer.findUnique({
      where: { semaphoreCommitment },
    });

    if (existingViewer) {
      return res.status(409).json({
        error: "This semaphore commitment is already registered",
      });
    }

    // If wallet provided, link to user
    let userId: string | null = null;
    if (walletAddress) {
      const user = await prisma.user.upsert({
        where: { walletAddress: walletAddress.toLowerCase() },
        update: {},
        create: { walletAddress: walletAddress.toLowerCase() },
      });
      userId = user.id;

      // Check if user already has a viewer profile
      const existingUserViewer = await prisma.viewer.findUnique({
        where: { userId: user.id },
      });

      if (existingUserViewer) {
        // Update existing viewer with new commitment
        const viewer = await prisma.viewer.update({
          where: { userId: user.id },
          data: { semaphoreCommitment },
        });

        return res.json({
          viewer: {
            id: viewer.id,
            commitment: viewer.semaphoreCommitment,
            walletAddress,
            isNew: false,
          },
        });
      }
    }

    // Create new viewer
    // If no wallet, we need a placeholder user
    if (!userId) {
      const placeholderUser = await prisma.user.create({
        data: {
          walletAddress:
            `anon_${semaphoreCommitment.slice(0, 16)}`.toLowerCase(),
        },
      });
      userId = placeholderUser.id;
    }

    const viewer = await prisma.viewer.create({
      data: {
        userId,
        semaphoreCommitment,
      },
    });

    return res.status(201).json({
      viewer: {
        id: viewer.id,
        commitment: viewer.semaphoreCommitment,
        walletAddress: walletAddress || null,
        isNew: true,
      },
    });
  } catch (error) {
    console.error("Error registering viewer:", error);
    return res.status(500).json({ error: "Failed to register viewer" });
  }
});

// Get viewer profile by commitment
router.get("/profile", async (req, res) => {
  try {
    const { commitment, walletAddress } = req.query;

    if (!commitment && !walletAddress) {
      return res.status(400).json({
        error: "Either commitment or walletAddress is required",
      });
    }

    let viewer;

    if (commitment && typeof commitment === "string") {
      viewer = await prisma.viewer.findUnique({
        where: { semaphoreCommitment: commitment },
        include: {
          user: {
            select: { walletAddress: true },
          },
        },
      });
    } else if (walletAddress && typeof walletAddress === "string") {
      viewer = await prisma.viewer.findFirst({
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
    }

    if (!viewer) {
      return res.status(404).json({ error: "Viewer not found" });
    }

    return res.json({
      viewer: {
        id: viewer.id,
        commitment: viewer.semaphoreCommitment,
        walletAddress: viewer.user.walletAddress.startsWith("anon_")
          ? null
          : viewer.user.walletAddress,
        totalAdsViewed: viewer.totalAdsViewed,
        totalEarnings: viewer.totalEarnings,
        pendingBalance: viewer.pendingBalance,
        claimedBalance: viewer.claimedBalance,
        createdAt: viewer.createdAt,
      },
    });
  } catch (error) {
    console.error("Error fetching viewer profile:", error);
    return res.status(500).json({ error: "Failed to fetch viewer profile" });
  }
});

// Link wallet to existing viewer (by commitment)
router.post("/link-wallet", async (req, res) => {
  try {
    const { commitment, walletAddress } = req.body;

    if (!commitment || !walletAddress) {
      return res.status(400).json({
        error: "commitment and walletAddress are required",
      });
    }

    const viewer = await prisma.viewer.findUnique({
      where: { semaphoreCommitment: commitment },
      include: { user: true },
    });

    if (!viewer) {
      return res.status(404).json({ error: "Viewer not found" });
    }

    // Check if the current user is a placeholder
    if (!viewer.user.walletAddress.startsWith("anon_")) {
      return res.status(400).json({
        error: "This viewer already has a linked wallet",
      });
    }

    // Check if target wallet already has a user
    const existingUser = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (existingUser) {
      // Check if existing user already has a viewer
      const existingViewer = await prisma.viewer.findUnique({
        where: { userId: existingUser.id },
      });

      if (existingViewer) {
        return res.status(400).json({
          error: "This wallet already has a viewer profile",
        });
      }

      // Transfer viewer to existing user
      await prisma.viewer.update({
        where: { id: viewer.id },
        data: { userId: existingUser.id },
      });

      // Delete placeholder user
      await prisma.user.delete({
        where: { id: viewer.user.id },
      });
    } else {
      // Update placeholder user's wallet address
      await prisma.user.update({
        where: { id: viewer.user.id },
        data: { walletAddress: walletAddress.toLowerCase() },
      });
    }

    return res.json({
      success: true,
      message: "Wallet linked successfully",
      walletAddress: walletAddress.toLowerCase(),
    });
  } catch (error) {
    console.error("Error linking wallet:", error);
    return res.status(500).json({ error: "Failed to link wallet" });
  }
});

// Get viewer stats
router.get("/stats", async (req, res) => {
  try {
    const { commitment } = req.query;

    if (!commitment || typeof commitment !== "string") {
      return res.status(400).json({ error: "commitment is required" });
    }

    const viewer = await prisma.viewer.findUnique({
      where: { semaphoreCommitment: commitment },
    });

    if (!viewer) {
      return res.status(404).json({ error: "Viewer not found" });
    }

    // Get recent impressions
    const recentImpressions = await prisma.impression.findMany({
      where: { viewerId: viewer.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        campaign: {
          select: {
            name: true,
            category: true,
          },
        },
      },
    });

    // Get aggregate stats
    const stats = await prisma.impression.aggregate({
      where: { viewerId: viewer.id },
      _count: true,
      _sum: {
        viewerEarning: true,
      },
    });

    return res.json({
      totalAdsViewed: stats._count,
      totalEarnings: stats._sum.viewerEarning || 0,
      pendingBalance: viewer.pendingBalance,
      recentActivity: recentImpressions.map((imp) => ({
        id: imp.id,
        campaign: imp.campaign.name,
        category: imp.campaign.category,
        earning: imp.viewerEarning,
        date: imp.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching viewer stats:", error);
    return res.status(500).json({ error: "Failed to fetch viewer stats" });
  }
});

export default router;
