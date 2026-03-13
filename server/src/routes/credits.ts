import { type Router, Router as ExpressRouter } from "express";
import { getCredits } from "../services/credits.js";

const router: Router = ExpressRouter();

// ─── GET /credits/:wallet ──────────────────────────────────────────────────────
// Returns current gas credit balance for a wallet address
router.get("/:wallet", (req, res) => {
  const { wallet } = req.params;

  if (!wallet || !wallet.startsWith("0x")) {
    res.status(400).json({ ok: false, error: "Invalid wallet address" });
    return;
  }

  const credits = getCredits(wallet);
  const creditsPerWatch = parseInt(process.env.CREDITS_PER_WATCH || "50000");

  res.json({
    ok: true,
    wallet: wallet.toLowerCase(),
    credits,
    // Human-friendly: how many simple txs can they do?
    estimatedTxs: Math.floor(credits / 150_000),
    adsNeeded: Math.max(0, Math.ceil((150_000 - credits) / creditsPerWatch)),
  });
});

export default router;
