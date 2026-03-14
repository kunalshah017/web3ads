import { describe, it, expect, beforeEach, vi } from "vitest";
import request from "supertest";
import app from "../app.js";
import prisma from "../db/index.js";

// Type the mocked prisma
const mockPrisma = prisma as unknown as {
  campaign: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  advertiser: {
    upsert: ReturnType<typeof vi.fn>;
  };
  publisher: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
  viewer: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  impression: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  rateLimit: {
    findUnique: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
  };
};

describe("Health & Info Endpoints", () => {
  it("GET /health returns ok status", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.timestamp).toBeDefined();
  });

  it("GET /api returns API info", async () => {
    const res = await request(app).get("/api");
    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Web3Ads API Server");
    expect(res.body.endpoints).toBeDefined();
    expect(res.body.endpoints.campaigns).toBe("/api/campaigns");
  });
});

describe("Campaigns API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/campaigns requires walletAddress", async () => {
    const res = await request(app).get("/api/campaigns");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("walletAddress");
  });

  it("GET /api/campaigns returns campaign list for wallet", async () => {
    mockPrisma.campaign.findMany.mockResolvedValue([
      {
        id: "campaign-1",
        name: "Test Campaign",
        adType: "banner",
        status: "active",
        budget: 1000,
        spent: 100,
        cpmRate: 2,
        createdAt: new Date(),
        _count: { impressions: 50 },
      },
    ]);

    const res = await request(app)
      .get("/api/campaigns")
      .query({ walletAddress: "0x1234567890123456789012345678901234567890" });
    expect(res.status).toBe(200);
    expect(res.body.campaigns).toBeDefined();
    expect(res.body.campaigns).toHaveLength(1);
    expect(res.body.campaigns[0].name).toBe("Test Campaign");
  });

  it("GET /api/campaigns/:id returns single campaign", async () => {
    mockPrisma.campaign.findUnique.mockResolvedValue({
      id: "campaign-1",
      name: "Test Campaign",
      adType: "banner",
      status: "active",
      budget: 1000,
      spent: 100,
      cpmRate: 2,
      impressions: [],
    });

    const res = await request(app).get("/api/campaigns/campaign-1");
    expect(res.status).toBe(200);
    expect(res.body.campaign.id).toBe("campaign-1");
  });

  it("GET /api/campaigns/:id returns 404 for non-existent campaign", async () => {
    mockPrisma.campaign.findUnique.mockResolvedValue(null);

    const res = await request(app).get("/api/campaigns/non-existent");
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("POST /api/campaigns requires walletAddress", async () => {
    const res = await request(app)
      .post("/api/campaigns")
      .send({ name: "Test" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("walletAddress");
  });

  it("POST /api/campaigns creates campaign successfully", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      id: "user-1",
      walletAddress: "0x1234567890123456789012345678901234567890",
    });

    mockPrisma.advertiser.upsert.mockResolvedValue({
      id: "adv-1",
      userId: "user-1",
    });

    mockPrisma.campaign.create.mockResolvedValue({
      id: "new-campaign",
      name: "New Campaign",
      adType: "BANNER",
      status: "draft",
      budget: 500,
      spent: 0,
      cpmRate: 2,
      createdAt: new Date(),
    });

    const res = await request(app).post("/api/campaigns").send({
      walletAddress: "0x1234567890123456789012345678901234567890",
      name: "New Campaign",
      adType: "BANNER",
      budget: 500,
      cpmRate: 2,
      mediaUrl: "https://example.com/ad.jpg",
      targetUrl: "https://example.com",
    });

    expect(res.status).toBe(201);
    expect(res.body.campaign.name).toBe("New Campaign");
  });
});

describe("Ads API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/ads/serve requires publisherWallet param", async () => {
    const res = await request(app).get("/api/ads/serve");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("publisherWallet");
  });

  it("GET /api/ads/serve returns null when no campaigns available", async () => {
    mockPrisma.campaign.findMany.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/ads/serve")
      .query({ publisherWallet: "0x1234567890123456789012345678901234567890" });

    expect(res.status).toBe(200);
    expect(res.body.ad).toBeNull();
  });

  it("GET /api/ads/serve returns ad with impressionToken", async () => {
    mockPrisma.campaign.findMany.mockResolvedValue([
      {
        id: "campaign-1",
        name: "Test Campaign",
        adType: "BANNER",
        category: "defi",
        mediaUrl: "https://example.com/ad.jpg",
        targetUrl: "https://example.com",
        cpmRate: 2,
        budget: 1000,
        spent: 0,
      },
    ]);

    const res = await request(app)
      .get("/api/ads/serve")
      .query({ publisherWallet: "0x1234567890123456789012345678901234567890" });

    expect(res.status).toBe(200);
    expect(res.body.ad).toBeDefined();
    expect(res.body.ad.campaignId).toBe("campaign-1");
    expect(res.body.ad.impressionToken).toBeDefined();
    expect(res.body.ad.impressionToken).toHaveLength(32); // 16 bytes hex
  });

  it("POST /api/ads/impression requires campaignId", async () => {
    const res = await request(app)
      .post("/api/ads/impression")
      .send({ publisherWallet: "0x123", impressionToken: "abc" });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain("campaignId");
  });
});

describe("Publishers API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/publishers/register requires walletAddress", async () => {
    const res = await request(app).post("/api/publishers/register").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("walletAddress");
  });

  it("POST /api/publishers/register creates publisher", async () => {
    mockPrisma.user.upsert.mockResolvedValue({
      id: "user-1",
      walletAddress: "0x1234567890123456789012345678901234567890",
    });

    mockPrisma.publisher.upsert.mockResolvedValue({
      id: "pub-1",
      userId: "user-1",
      websiteUrl: "https://example.com",
      isVerified: false,
      createdAt: new Date(),
    });

    const res = await request(app).post("/api/publishers/register").send({
      walletAddress: "0x1234567890123456789012345678901234567890",
      websiteUrl: "https://example.com",
    });

    expect(res.status).toBe(201);
    expect(res.body.publisher).toBeDefined();
    expect(res.body.publisher.walletAddress).toBe(
      "0x1234567890123456789012345678901234567890",
    );
  });

  it("GET /api/publishers/profile requires walletAddress", async () => {
    const res = await request(app).get("/api/publishers/profile");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("walletAddress");
  });
});

describe("Viewers API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST /api/viewers/register requires semaphoreCommitment", async () => {
    const res = await request(app).post("/api/viewers/register").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("semaphoreCommitment");
  });

  it("POST /api/viewers/register creates viewer with commitment", async () => {
    mockPrisma.viewer.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: "user-1",
      walletAddress: "anon_1234567890123456",
    });
    mockPrisma.viewer.create.mockResolvedValue({
      id: "viewer-1",
      userId: "user-1",
      semaphoreCommitment: "1234567890123456789012345678901234567890",
    });

    const res = await request(app).post("/api/viewers/register").send({
      semaphoreCommitment: "1234567890123456789012345678901234567890",
    });

    expect(res.status).toBe(201);
    expect(res.body.viewer).toBeDefined();
    expect(res.body.viewer.isNew).toBe(true);
  });
});

describe("Rewards API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/rewards/balance requires walletAddress", async () => {
    const res = await request(app).get("/api/rewards/balance");
    expect(res.status).toBe(400);
    expect(res.body.error).toContain("walletAddress");
  });

  it("GET /api/rewards/balance returns balances for wallet", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user-1",
      walletAddress: "0x1234567890123456789012345678901234567890",
      publisher: {
        pendingBalance: 50.5,
        claimedBalance: 100,
        totalEarnings: 150.5,
      },
      viewer: null,
    });

    const res = await request(app)
      .get("/api/rewards/balance")
      .query({ walletAddress: "0x1234567890123456789012345678901234567890" });

    expect(res.status).toBe(200);
    expect(res.body.publisher).toBeDefined();
    expect(res.body.publisher.pending).toBe(50.5);
    expect(res.body.total.pending).toBe(50.5);
    expect(res.body.canWithdraw).toBe(true);
  });

  it("GET /api/rewards/balance returns zeros for new wallet", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/rewards/balance")
      .query({ walletAddress: "0xnewwallet" });

    expect(res.status).toBe(200);
    expect(res.body.publisher).toBeNull();
    expect(res.body.viewer).toBeNull();
    expect(res.body.total.pending).toBe(0);
  });
});
