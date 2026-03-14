import { Router, type IRouter } from "express";
import prisma from "../db/index.js";
import { AdType, CampaignStatus } from "@prisma/client";

const router: IRouter = Router();

// Get all campaigns for an advertiser
router.get("/", async (req, res) => {
  try {
    const { walletAddress } = req.query;

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ error: "walletAddress is required" });
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        advertiser: {
          user: {
            walletAddress: walletAddress.toLowerCase(),
          },
        },
      },
      include: {
        _count: {
          select: { impressions: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json({ campaigns });
  } catch (error) {
    console.error("Error fetching campaigns:", error);
    return res.status(500).json({ error: "Failed to fetch campaigns" });
  }
});

// Get single campaign by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: {
        advertiser: {
          include: {
            user: {
              select: { walletAddress: true },
            },
          },
        },
        _count: {
          select: { impressions: true },
        },
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    return res.json({ campaign });
  } catch (error) {
    console.error("Error fetching campaign:", error);
    return res.status(500).json({ error: "Failed to fetch campaign" });
  }
});

// Create new campaign
router.post("/", async (req, res) => {
  try {
    const {
      walletAddress,
      name,
      description,
      adType,
      category,
      mediaUrl,
      targetUrl,
      cpmRate,
      budget,
    } = req.body;

    if (
      !walletAddress ||
      !name ||
      !adType ||
      !mediaUrl ||
      !targetUrl ||
      !budget
    ) {
      return res.status(400).json({
        error:
          "Missing required fields: walletAddress, name, adType, mediaUrl, targetUrl, budget",
      });
    }

    // Validate adType
    if (!Object.values(AdType).includes(adType)) {
      return res.status(400).json({
        error: `Invalid adType. Must be one of: ${Object.values(AdType).join(", ")}`,
      });
    }

    // Find or create user and advertiser
    const user = await prisma.user.upsert({
      where: { walletAddress: walletAddress.toLowerCase() },
      update: {},
      create: { walletAddress: walletAddress.toLowerCase() },
    });

    const advertiser = await prisma.advertiser.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    });

    // Default CPM rates by ad type
    const defaultCpmRates: Record<AdType, number> = {
      BANNER: 2,
      SQUARE: 3,
      SIDEBAR: 4,
      INTERSTITIAL: 8,
    };

    const campaign = await prisma.campaign.create({
      data: {
        advertiserId: advertiser.id,
        name,
        description,
        adType: adType as AdType,
        category,
        mediaUrl,
        targetUrl,
        cpmRate: cpmRate || defaultCpmRates[adType as AdType],
        budget: parseFloat(budget),
        status: CampaignStatus.DRAFT,
      },
    });

    return res.status(201).json({ campaign });
  } catch (error) {
    console.error("Error creating campaign:", error);
    return res.status(500).json({ error: "Failed to create campaign" });
  }
});

// Update campaign
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remove fields that shouldn't be updated directly
    delete updates.id;
    delete updates.advertiserId;
    delete updates.spent;
    delete updates.createdAt;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: updates,
    });

    return res.json({ campaign });
  } catch (error) {
    console.error("Error updating campaign:", error);
    return res.status(500).json({ error: "Failed to update campaign" });
  }
});

// Activate campaign (set status to ACTIVE)
router.post("/:id/activate", async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({ where: { id } });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    // Check if campaign has budget
    if (Number(campaign.budget) <= Number(campaign.spent)) {
      return res
        .status(400)
        .json({ error: "Campaign has no remaining budget" });
    }

    const updated = await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.ACTIVE },
    });

    return res.json({ campaign: updated });
  } catch (error) {
    console.error("Error activating campaign:", error);
    return res.status(500).json({ error: "Failed to activate campaign" });
  }
});

// Pause campaign
router.post("/:id/pause", async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.update({
      where: { id },
      data: { status: CampaignStatus.PAUSED },
    });

    return res.json({ campaign });
  } catch (error) {
    console.error("Error pausing campaign:", error);
    return res.status(500).json({ error: "Failed to pause campaign" });
  }
});

// Get campaign stats
router.get("/:id/stats", async (req, res) => {
  try {
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        budget: true,
        spent: true,
        status: true,
        cpmRate: true,
      },
    });

    if (!campaign) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    const impressionStats = await prisma.impression.aggregate({
      where: { campaignId: id },
      _count: true,
      _sum: {
        costPerImpression: true,
        publisherEarning: true,
        viewerEarning: true,
        platformFee: true,
      },
    });

    const verifiedCount = await prisma.impression.count({
      where: { campaignId: id, hasExtension: true },
    });

    return res.json({
      campaign,
      stats: {
        totalImpressions: impressionStats._count,
        verifiedImpressions: verifiedCount,
        totalSpent: impressionStats._sum.costPerImpression || 0,
        publisherPayouts: impressionStats._sum.publisherEarning || 0,
        viewerPayouts: impressionStats._sum.viewerEarning || 0,
        platformRevenue: impressionStats._sum.platformFee || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching campaign stats:", error);
    return res.status(500).json({ error: "Failed to fetch campaign stats" });
  }
});

export default router;
