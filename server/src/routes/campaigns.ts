import { Router, type IRouter } from "express";
import prisma from "../db/index.js";
import { AdType, CampaignStatus } from "@prisma/client";
import {
  x402,
  getX402Payment,
  generatePaymentInfo,
} from "../middleware/x402.js";

const router: IRouter = Router();

// Demo CPM rates (500x inflated for hackathon)
const CPM_RATES: Record<AdType, number> = {
  BANNER: 0.5,
  SQUARE: 0.75,
  SIDEBAR: 1.0,
  INTERSTITIAL: 2.0,
};

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

// ============================================================================
// x402 PROTECTED ENDPOINTS - Payment required for these operations
// ============================================================================

/**
 * Fund a campaign with x402 payment
 * POST /api/campaigns/:id/fund
 *
 * Requires x402 payment headers:
 * - X-Payment-Method: "direct" | "web3ads-balance"
 * - X-Payment-Proof: txHash (for direct payment)
 * - X-Payer-Address: wallet address
 */
router.post(
  "/:id/fund",
  async (req, res, next) => {
    const { amount } = req.body;

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({
        error: "amount is required and must be positive",
      });
    }

    // Apply x402 middleware with the requested amount
    const middleware = x402({
      resourceType: "campaign",
      priceETH: parseFloat(amount),
      description: `Fund campaign with ${amount} ETH`,
      acceptWeb3AdsBalance: true, // Allow using ad earnings!
    });

    return middleware(req, res, next);
  },
  async (req, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      const payment = getX402Payment(req);

      if (!payment?.verified) {
        return res.status(402).json({ error: "Payment not verified" });
      }

      const campaign = await prisma.campaign.findUnique({ where: { id } });

      if (!campaign) {
        return res.status(404).json({ error: "Campaign not found" });
      }

      // Add budget to campaign
      const updated = await prisma.campaign.update({
        where: { id },
        data: {
          budget: { increment: parseFloat(amount) },
          status: CampaignStatus.ACTIVE, // Auto-activate when funded
        },
      });

      console.log(
        `[x402] Campaign funded: ${id} +${amount} ETH via ${payment.method} by ${payment.payer}`,
      );

      return res.json({
        campaign: updated,
        payment: {
          method: payment.method,
          amount: payment.amount,
          txHash: payment.txHash,
          payer: payment.payer,
          remainingWeb3AdsBalance: payment.remainingBalance,
        },
        message: `Campaign funded with ${amount} ETH${payment.method === "web3ads-balance" ? " from your ad earnings!" : ""}`,
      });
    } catch (error) {
      console.error("Error funding campaign:", error);
      return res.status(500).json({ error: "Failed to fund campaign" });
    }
  },
);

/**
 * Create and fund campaign in one step with x402 payment
 * POST /api/campaigns/create-funded
 *
 * This is the recommended endpoint for AI agents.
 * Creates campaign and funds it atomically.
 */
router.post(
  "/create-funded",
  async (req, res, next) => {
    const { budget, adType } = req.body;

    if (!budget || parseFloat(budget) <= 0) {
      return res.status(400).json({
        error: "budget is required and must be positive",
        paymentInfo: generatePaymentInfo(0.5, "campaign-creation"),
      });
    }

    // Apply x402 middleware with the campaign budget
    const middleware = x402({
      resourceType: "campaign",
      priceETH: parseFloat(budget),
      description: `Create campaign with ${budget} ETH budget`,
      acceptWeb3AdsBalance: true,
    });

    return middleware(req, res, next);
  },
  async (req, res) => {
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

      const payment = getX402Payment(req);

      if (!payment?.verified) {
        return res.status(402).json({ error: "Payment not verified" });
      }

      // Validate required fields
      if (!walletAddress || !name || !adType || !mediaUrl || !targetUrl) {
        return res.status(400).json({
          error:
            "Missing required fields: walletAddress, name, adType, mediaUrl, targetUrl",
        });
      }

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

      // Create campaign with budget and ACTIVE status
      const campaign = await prisma.campaign.create({
        data: {
          advertiserId: advertiser.id,
          name,
          description,
          adType: adType as AdType,
          category,
          mediaUrl,
          targetUrl,
          cpmRate: cpmRate || CPM_RATES[adType as AdType],
          budget: parseFloat(budget),
          status: CampaignStatus.ACTIVE, // Immediately active since it's funded
        },
      });

      console.log(
        `[x402] Campaign created: ${campaign.id} with ${budget} ETH via ${payment.method} by ${payment.payer}`,
      );

      return res.status(201).json({
        campaign,
        payment: {
          method: payment.method,
          amount: payment.amount,
          txHash: payment.txHash,
          payer: payment.payer,
          remainingWeb3AdsBalance: payment.remainingBalance,
        },
        message: `Campaign "${name}" created and funded with ${budget} ETH${payment.method === "web3ads-balance" ? " using your ad earnings!" : ""}`,
      });
    } catch (error) {
      console.error("Error creating funded campaign:", error);
      return res.status(500).json({ error: "Failed to create campaign" });
    }
  },
);

/**
 * Get x402 payment info for campaign operations
 * GET /api/campaigns/payment-info
 *
 * Returns information about how to pay for campaign operations.
 * Useful for AI agents to understand payment requirements.
 */
router.get("/payment-info", async (req, res) => {
  const { walletAddress } = req.query;

  let balance = null;
  if (walletAddress && typeof walletAddress === "string") {
    const user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: { publisher: true, viewer: true },
    });

    if (user) {
      const publisherPending = Number(user.publisher?.pendingBalance || 0);
      const viewerPending = Number(user.viewer?.pendingBalance || 0);
      balance = {
        available: publisherPending + viewerPending,
        fromPublishing: publisherPending,
        fromViewing: viewerPending,
      };
    }
  }

  return res.json({
    protocol: "x402",
    description: "Web3Ads supports x402 payment protocol for AI agents",
    paymentAddress:
      process.env.PLATFORM_WALLET_ADDRESS ||
      "0x8Bc2D17889EF9d04AA620e7984D7E7f74305215E",
    network: "base-sepolia",
    chainId: 84532,
    currency: "ETH",
    methods: {
      direct: {
        description: "Pay directly with ETH on Base Sepolia",
        headers: {
          "X-Payment-Method": "direct",
          "X-Payment-Proof": "<transaction-hash>",
          "X-Payer-Address": "<your-wallet-address>",
        },
      },
      web3adsBalance: {
        description: "Pay using your Web3Ads ad earnings (gasless!)",
        headers: {
          "X-Payment-Method": "web3ads-balance",
          "X-Payer-Address": "<your-wallet-address>",
        },
        yourBalance: balance,
      },
    },
    endpoints: {
      createFunded: {
        method: "POST",
        path: "/api/campaigns/create-funded",
        description: "Create and fund a campaign in one atomic operation",
        paymentRequired: true,
        priceSource: "body.budget",
      },
      fund: {
        method: "POST",
        path: "/api/campaigns/:id/fund",
        description: "Add budget to an existing campaign",
        paymentRequired: true,
        priceSource: "body.amount",
      },
    },
    cpmRates: CPM_RATES,
  });
});

export default router;
