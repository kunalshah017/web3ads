import { type Router, Router as ExpressRouter } from "express";
import { randomUUID } from "crypto";

const router: Router = ExpressRouter();

// ─── Hardcoded demo ads ────────────────────────────────────────────────────────
// When Kunal's API is ready, replace this array with a fetch to his ad server
const DEMO_ADS = [
  {
    id: "ad-001",
    title: "Base Ecosystem",
    description: "Build on Base — the fast, low-cost, builder-friendly L2.",
    imageUrl: "https://picsum.photos/seed/base/800/450",
    linkUrl: "https://base.org",
    duration: 30, // seconds user must watch
  },
  {
    id: "ad-002",
    title: "Ethereum Hackathon",
    description: "ETH Mumbai 2025 — where builders come to ship.",
    imageUrl: "https://picsum.photos/seed/eth/800/450",
    linkUrl: "https://ethindia.co",
    duration: 30,
  },
  {
    id: "ad-003",
    title: "Web3Ads Network",
    description: "Watch ads, earn gas credits, transact for free.",
    imageUrl: "https://picsum.photos/seed/web3ads/800/450",
    linkUrl: "https://web3ads.wtf",
    duration: 30,
  },
];

// ─── GET /ads/next ─────────────────────────────────────────────────────────────
// Returns a random ad to display to the user
router.get("/next", (_req, res) => {
  const ad = DEMO_ADS[Math.floor(Math.random() * DEMO_ADS.length)];
  res.json({ ok: true, ad });
});

// ─── POST /ads/watched ─────────────────────────────────────────────────────────
// Called by frontend after user finishes watching
// Body: { wallet: string, adId: string }
router.post("/watched", async (req, res) => {
  const { wallet, adId } = req.body as { wallet?: string; adId?: string };

  if (!wallet || !adId) {
    res.status(400).json({ ok: false, error: "wallet and adId are required" });
    return;
  }

  // Validate adId is a real ad
  const adExists = DEMO_ADS.some((a) => a.id === adId);
  if (!adExists) {
    res.status(400).json({ ok: false, error: "Unknown ad" });
    return;
  }

  // Get real IP (behind proxy, use x-forwarded-for)
  const rawIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  // Lazy-import to avoid circular init on startup
  const { awardCredits } = await import("../services/credits.js");
  const result = awardCredits(wallet, adId, rawIp);

  if (!result.ok) {
    res.status(429).json({ ok: false, error: result.reason });
    return;
  }

  res.json({ ok: true, newBalance: result.credits, earned: parseInt(process.env.CREDITS_PER_WATCH || "50000") });
});

export default router;
