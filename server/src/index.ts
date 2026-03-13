import express, { type Express } from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──────────────────────────────────────────────────────────────────
import adsRouter     from "./routes/ads.js";
import creditsRouter from "./routes/credits.js";
import relayRouter   from "./routes/relay.js";

app.use("/ads",     adsRouter);
app.use("/credits", creditsRouter);
app.use("/tx",      relayRouter);

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    forwarder: process.env.FORWARDER_ADDRESS || "not configured",
  });
});

app.get("/api", (_req, res) => {
  res.json({
    message: "Web3Ads Gasless API",
    endpoints: [
      "GET  /health",
      "GET  /ads/next",
      "POST /ads/watched",
      "GET  /credits/:wallet",
      "POST /tx/relay",
      "GET  /tx/:id/status",
      "GET  /tx/history/:wallet",
    ],
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   Forwarder: ${process.env.FORWARDER_ADDRESS || "⚠️  not set"}`);
  console.log(`   Relayer:   ${process.env.RELAYER_PRIVATE_KEY ? "✅ configured" : "⚠️  not set"}`);
});

export default app;
