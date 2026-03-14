import express, { type Express } from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import campaignsRouter from "./routes/campaigns.js";
import adsRouter from "./routes/ads.js";
import publishersRouter from "./routes/publishers.js";
import viewersRouter from "./routes/viewers.js";
import rewardsRouter from "./routes/rewards.js";
import {
  createOfficialX402Middleware,
  getPlatformWallet,
} from "./middleware/x402.js";

dotenv.config();

const app: Express = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// x402 protocol info endpoint - helps AI agents understand payment requirements
app.get("/api/x402-info", (_req, res) => {
  res.json({
    protocol: "x402",
    version: "1.0.0",
    description:
      "Web3Ads implements the Coinbase x402 payment protocol for AI agents",
    paymentAddress: getPlatformWallet(),
    network: "base-sepolia",
    chainId: 84532,
    methods: {
      usdc: {
        description:
          "Pay with USDC on Base Sepolia using standard x402 protocol",
        compatible: ["HeyElsa", "OpenClaw", "Coinbase CDP"],
      },
      web3adsBalance: {
        description: "Pay using your Web3Ads ad earnings (gasless!)",
        unique: true,
        headers: {
          "X-Payment-Method": "web3ads-balance",
          "X-Payer-Address": "<your-wallet-address>",
        },
      },
    },
    paidEndpoints: {
      "POST /api/campaigns/create-funded": {
        description: "Create and fund an ad campaign",
        priceSource: "body.budget (ETH)",
      },
      "POST /api/campaigns/:id/fund": {
        description: "Add budget to existing campaign",
        priceSource: "body.amount (ETH)",
      },
    },
    documentation: "https://x402.org",
  });
});

// API info
app.get("/api", (_req, res) => {
  res.json({
    name: "Web3Ads API Server",
    version: "1.0.0",
    x402: {
      enabled: true,
      protocol: "Coinbase x402",
      infoEndpoint: "/api/x402-info",
    },
    endpoints: {
      campaigns: "/api/campaigns",
      ads: "/api/ads",
      publishers: "/api/publishers",
      viewers: "/api/viewers",
      rewards: "/api/rewards",
    },
  });
});

// Mount routes
app.use("/api/campaigns", campaignsRouter);
app.use("/api/ads", adsRouter);
app.use("/api/publishers", publishersRouter);
app.use("/api/viewers", viewersRouter);
app.use("/api/rewards", rewardsRouter);

// Error handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  },
);

export default app;
