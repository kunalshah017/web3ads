import { Router, type IRouter } from "express";
import prisma from "../db/index.js";
import { AdType, CampaignStatus } from "@prisma/client";
import crypto from "crypto";
import {
  signImpression,
  isBlockchainEnabled,
} from "../blockchain/index.js";

const router: IRouter = Router();

// Revenue split percentages
const REVENUE_SPLIT = {
  PUBLISHER: 0.5, // 50%
  VIEWER: 0.2, // 20%
  PLATFORM: 0.3, // 30%
  PLATFORM_NO_VIEWER: 0.5, // 50% when no viewer extension
};

// Rate limiting config
const RATE_LIMITS = {
  MAX_PER_IP_PER_HOUR: 10,
  MAX_PER_FINGERPRINT_PER_HOUR: 20,
  WINDOW_MS: 60 * 60 * 1000, // 1 hour
};

// Helper to hash identifiers
function hashIdentifier(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

// Serve an ad based on type and category
router.get("/serve", async (req, res) => {
  try {
    const { type, category, publisherWallet } = req.query;

    if (!publisherWallet || typeof publisherWallet !== "string") {
      return res.status(400).json({ error: "publisherWallet is required" });
    }

    // Build query conditions
    const where: any = {
      status: CampaignStatus.ACTIVE,
      budget: { gt: prisma.campaign.fields.spent },
    };

    if (type && Object.values(AdType).includes(type as AdType)) {
      where.adType = type as AdType;
    }

    if (category && typeof category === "string") {
      where.category = category;
    }

    // Find eligible campaigns (random selection weighted by remaining budget)
    const campaigns = await prisma.campaign.findMany({
      where,
      select: {
        id: true,
        name: true,
        adType: true,
        category: true,
        mediaUrl: true,
        targetUrl: true,
        cpmRate: true,
        budget: true,
        spent: true,
      },
      take: 10,
    });

    if (campaigns.length === 0) {
      return res.json({ ad: null, message: "No eligible ads found" });
    }

    // Weight selection by remaining budget
    const totalRemainingBudget = campaigns.reduce(
      (sum, c) => sum + (Number(c.budget) - Number(c.spent)),
      0,
    );

    let random = Math.random() * totalRemainingBudget;
    let selectedCampaign = campaigns[0];

    for (const campaign of campaigns) {
      const remaining = Number(campaign.budget) - Number(campaign.spent);
      random -= remaining;
      if (random <= 0) {
        selectedCampaign = campaign;
        break;
      }
    }

    // Generate a unique impression token (used for verification)
    const impressionToken = crypto.randomBytes(16).toString("hex");

    return res.json({
      ad: {
        campaignId: selectedCampaign.id,
        type: selectedCampaign.adType,
        mediaUrl: selectedCampaign.mediaUrl,
        targetUrl: selectedCampaign.targetUrl,
        category: selectedCampaign.category,
        impressionToken,
      },
    });
  } catch (error) {
    console.error("Error serving ad:", error);
    return res.status(500).json({ error: "Failed to serve ad" });
  }
});

// Record an impression
router.post("/impression", async (req, res) => {
  try {
    const {
      campaignId,
      publisherWallet,
      impressionToken,
      viewDuration,
      // Optional: zkProof data from extension
      semaphoreNullifier,
      viewerCommitment,
      // Fingerprinting for fraud prevention
      fingerprint,
    } = req.body;

    if (!campaignId || !publisherWallet || !impressionToken) {
      return res.status(400).json({
        error:
          "Missing required fields: campaignId, publisherWallet, impressionToken",
      });
    }

    // Get client IP
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";
    const ipHash = hashIdentifier(ip);
    const userAgentHash = hashIdentifier(
      req.headers["user-agent"] || "unknown",
    );

    // Check rate limits (IP-based)
    const windowStart = new Date(
      Math.floor(Date.now() / RATE_LIMITS.WINDOW_MS) * RATE_LIMITS.WINDOW_MS,
    );

    const ipRateLimit = await prisma.rateLimit.findUnique({
      where: {
        identifier_identifierType_campaignId_windowStart: {
          identifier: ipHash,
          identifierType: "ip",
          campaignId,
          windowStart,
        },
      },
    });

    if (ipRateLimit && ipRateLimit.count >= RATE_LIMITS.MAX_PER_IP_PER_HOUR) {
      return res.status(429).json({ error: "Rate limit exceeded" });
    }

    // Check fingerprint rate limit if provided
    if (fingerprint) {
      const fpHash = hashIdentifier(fingerprint);
      const fpRateLimit = await prisma.rateLimit.findUnique({
        where: {
          identifier_identifierType_campaignId_windowStart: {
            identifier: fpHash,
            identifierType: "fingerprint",
            campaignId,
            windowStart,
          },
        },
      });

      if (
        fpRateLimit &&
        fpRateLimit.count >= RATE_LIMITS.MAX_PER_FINGERPRINT_PER_HOUR
      ) {
        return res.status(429).json({ error: "Rate limit exceeded" });
      }
    }

    // Check semaphore nullifier uniqueness (prevents double-counting with extension)
    if (semaphoreNullifier) {
      const existingNullifier = await prisma.impression.findUnique({
        where: { semaphoreNullifier },
      });

      if (existingNullifier) {
        return res.status(409).json({ error: "Duplicate proof submitted" });
      }
    }

    // Get campaign details
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        cpmRate: true,
        budget: true,
        spent: true,
        status: true,
      },
    });

    if (!campaign || campaign.status !== CampaignStatus.ACTIVE) {
      return res.status(404).json({ error: "Campaign not found or inactive" });
    }

    // Check budget
    const remainingBudget = Number(campaign.budget) - Number(campaign.spent);
    const costPerImpression = Number(campaign.cpmRate) / 1000;

    if (remainingBudget < costPerImpression) {
      return res.status(400).json({ error: "Campaign budget exhausted" });
    }

    // Find or create publisher
    const publisherUser = await prisma.user.upsert({
      where: { walletAddress: publisherWallet.toLowerCase() },
      update: {},
      create: { walletAddress: publisherWallet.toLowerCase() },
    });

    const publisher = await prisma.publisher.upsert({
      where: { userId: publisherUser.id },
      update: {},
      create: { userId: publisherUser.id },
    });

    // Calculate revenue split
    const hasExtension = !!semaphoreNullifier;
    const publisherEarning = costPerImpression * REVENUE_SPLIT.PUBLISHER;
    const viewerEarning = hasExtension
      ? costPerImpression * REVENUE_SPLIT.VIEWER
      : 0;
    const platformFee = hasExtension
      ? costPerImpression * REVENUE_SPLIT.PLATFORM
      : costPerImpression * REVENUE_SPLIT.PLATFORM_NO_VIEWER;

    // Find viewer if extension is present
    let viewerId: string | null = null;
    if (hasExtension && viewerCommitment) {
      const viewer = await prisma.viewer.findUnique({
        where: { semaphoreCommitment: viewerCommitment },
      });
      viewerId = viewer?.id || null;
    }

    // Create impression record
    const impression = await prisma.impression.create({
      data: {
        campaignId,
        publisherId: publisher.id,
        viewerId,
        ipHash,
        userAgentHash,
        semaphoreNullifier,
        costPerImpression,
        publisherEarning,
        viewerEarning,
        platformFee,
        isVerified: hasExtension,
        hasExtension,
        viewDuration: viewDuration ? parseInt(viewDuration) : null,
      },
    });

    // Update campaign spent
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        spent: { increment: costPerImpression },
      },
    });

    // Update publisher earnings
    await prisma.publisher.update({
      where: { id: publisher.id },
      data: {
        totalViews: { increment: 1 },
        totalEarnings: { increment: publisherEarning },
        pendingBalance: { increment: publisherEarning },
      },
    });

    // Update viewer earnings if applicable
    if (viewerId && viewerEarning > 0) {
      await prisma.viewer.update({
        where: { id: viewerId },
        data: {
          totalAdsViewed: { increment: 1 },
          totalEarnings: { increment: viewerEarning },
          pendingBalance: { increment: viewerEarning },
        },
      });
    }

    // Update rate limits
    await prisma.rateLimit.upsert({
      where: {
        identifier_identifierType_campaignId_windowStart: {
          identifier: ipHash,
          identifierType: "ip",
          campaignId,
          windowStart,
        },
      },
      update: { count: { increment: 1 } },
      create: {
        identifier: ipHash,
        identifierType: "ip",
        campaignId,
        count: 1,
        windowStart,
      },
    });

    if (fingerprint) {
      const fpHash = hashIdentifier(fingerprint);
      await prisma.rateLimit.upsert({
        where: {
          identifier_identifierType_campaignId_windowStart: {
            identifier: fpHash,
            identifierType: "fingerprint",
            campaignId,
            windowStart,
          },
        },
        update: { count: { increment: 1 } },
        create: {
          identifier: fpHash,
          identifierType: "fingerprint",
          campaignId,
          count: 1,
          windowStart,
        },
      });
    }

    return res.status(201).json({
      success: true,
      impression: {
        id: impression.id,
        verified: hasExtension,
        publisherEarning,
        viewerEarning,
      },
    });
  } catch (error) {
    console.error("Error recording impression:", error);
    return res.status(500).json({ error: "Failed to record impression" });
  }
});

// Sign an impression for on-chain recording (optional endpoint)
router.post("/sign-impression", async (req, res) => {
  try {
    const { advertiser, campaignId, publisher, viewerCommitment, nullifier } =
      req.body;

    if (!advertiser || !campaignId || !publisher || !nullifier) {
      return res.status(400).json({
        error:
          "Missing required fields: advertiser, campaignId, publisher, nullifier",
      });
    }

    if (!isBlockchainEnabled()) {
      return res.status(503).json({
        error: "Blockchain integration not configured",
      });
    }

    // Generate signature
    const signature = await signImpression({
      advertiser: advertiser as `0x${string}`,
      campaignId: campaignId as `0x${string}`,
      publisher: publisher as `0x${string}`,
      viewerCommitment: (viewerCommitment ||
        "0x0000000000000000000000000000000000000000000000000000000000000000") as `0x${string}`,
      nullifier: nullifier as `0x${string}`,
    });

    if (!signature) {
      return res.status(500).json({ error: "Failed to generate signature" });
    }

    return res.json({
      signature,
      parameters: {
        advertiser,
        campaignId,
        publisher,
        viewerCommitment:
          viewerCommitment ||
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        nullifier,
      },
    });
  } catch (error) {
    console.error("Error signing impression:", error);
    return res.status(500).json({ error: "Failed to sign impression" });
  }
});

// Check blockchain status
router.get("/blockchain-status", async (_req, res) => {
  return res.json({
    enabled: isBlockchainEnabled(),
    contract: process.env.WEB3ADS_CORE_ADDRESS || null,
  });
});

export default router;
