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
      include: { user: true },
    });

    if (existingViewer) {
      // Commitment exists - check if it's the same wallet trying to re-register
      const existingWallet = existingViewer.user.walletAddress;
      const isAnonymous = existingWallet.startsWith("anon_");

      if (walletAddress) {
        const normalizedWallet = walletAddress.toLowerCase();

        if (!isAnonymous && existingWallet === normalizedWallet) {
          // Same wallet, same commitment - return existing (idempotent)
          return res.json({
            viewer: {
              id: existingViewer.id,
              commitment: existingViewer.semaphoreCommitment,
              walletAddress: existingWallet,
              isNew: false,
            },
          });
        }

        if (isAnonymous) {
          // Anonymous viewer wants to link wallet - update the placeholder
          const existingUser = await prisma.user.findUnique({
            where: { walletAddress: normalizedWallet },
          });

          if (existingUser) {
            // Wallet already has a user - check if they have a viewer
            const walletViewer = await prisma.viewer.findUnique({
              where: { userId: existingUser.id },
            });

            if (walletViewer) {
              // Wallet already has a viewer - can't link to this commitment
              return res.status(409).json({
                error:
                  "This wallet already has a viewer profile. Clear your browser data to start fresh.",
              });
            }

            // Transfer viewer to existing user and delete placeholder
            const oldUserId = existingViewer.userId;
            const viewer = await prisma.viewer.update({
              where: { id: existingViewer.id },
              data: { userId: existingUser.id },
            });
            await prisma.user.delete({ where: { id: oldUserId } });

            return res.json({
              viewer: {
                id: viewer.id,
                commitment: viewer.semaphoreCommitment,
                walletAddress: normalizedWallet,
                isNew: false,
              },
            });
          }

          // Update placeholder user with real wallet
          await prisma.user.update({
            where: { id: existingViewer.userId },
            data: { walletAddress: normalizedWallet },
          });

          return res.json({
            viewer: {
              id: existingViewer.id,
              commitment: existingViewer.semaphoreCommitment,
              walletAddress: normalizedWallet,
              isNew: false,
            },
          });
        }

        // Different wallet, non-anonymous commitment - conflict
        return res.status(409).json({
          error:
            "This browser's identity is linked to a different wallet. Clear browser data to start fresh.",
        });
      }

      // No wallet provided, commitment exists - return existing
      return res.json({
        viewer: {
          id: existingViewer.id,
          commitment: existingViewer.semaphoreCommitment,
          walletAddress: isAnonymous ? null : existingWallet,
          isNew: false,
        },
      });
    }

    // Commitment doesn't exist - check if wallet has an existing viewer
    let userId: string | null = null;
    if (walletAddress) {
      const user = await prisma.user.upsert({
        where: { walletAddress: walletAddress.toLowerCase() },
        update: {},
        create: { walletAddress: walletAddress.toLowerCase() },
      });
      userId = user.id;

      // Check if user already has a viewer profile (different browser scenario)
      const existingUserViewer = await prisma.viewer.findUnique({
        where: { userId: user.id },
      });

      if (existingUserViewer) {
        // Update existing viewer with new commitment from this browser
        const viewer = await prisma.viewer.update({
          where: { userId: user.id },
          data: { semaphoreCommitment },
        });

        return res.json({
          viewer: {
            id: viewer.id,
            commitment: viewer.semaphoreCommitment,
            walletAddress: walletAddress.toLowerCase(),
            isNew: false,
            message: "Updated viewer identity for this browser",
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
