import express, { type Express } from "express";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import campaignsRouter from "./routes/campaigns.js";
import adsRouter from "./routes/ads.js";
import publishersRouter from "./routes/publishers.js";
import viewersRouter from "./routes/viewers.js";
import rewardsRouter from "./routes/rewards.js";

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

// API info
app.get("/api", (_req, res) => {
  res.json({
    name: "Web3Ads API Server",
    version: "1.0.0",
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
