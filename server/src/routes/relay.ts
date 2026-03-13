import { type Router, Router as ExpressRouter } from "express";
import { relayTransaction, getTx, getTxHistory, type ForwardRequest } from "../services/relayer.js";

const router: Router = ExpressRouter();

// ─── POST /tx/relay ────────────────────────────────────────────────────────────
// Body: { request: ForwardRequest, sig: string }
// The frontend builds a ForwardRequest, signs it with the user's wallet (EIP-712),
// then sends the request + sig here. We verify, deduct credits, and broadcast.
router.post("/relay", async (req, res) => {
  const { request, sig } = req.body as { request?: ForwardRequest; sig?: string };

  if (!request || !sig) {
    res.status(400).json({ ok: false, error: "request and sig are required" });
    return;
  }

  const requiredFields: (keyof ForwardRequest)[] = ["from", "to", "value", "gas", "nonce", "data"];
  for (const field of requiredFields) {
    if (request[field] === undefined || request[field] === null) {
      res.status(400).json({ ok: false, error: `Missing field: request.${field}` });
      return;
    }
  }

  if (!request.from.startsWith("0x") || !request.to.startsWith("0x")) {
    res.status(400).json({ ok: false, error: "from and to must be 0x addresses" });
    return;
  }

  try {
    const result = await relayTransaction(request, sig);

    if (result.error && !result.txHash) {
      res.status(400).json({ ok: false, ...result });
      return;
    }

    res.json({ ok: true, id: result.id, txHash: result.txHash });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal relay error";
    console.error("[relay] error:", msg);
    res.status(500).json({ ok: false, error: msg });
  }
});

// ─── GET /tx/:id/status ────────────────────────────────────────────────────────
// Poll tx status after relay
router.get("/:id/status", (req, res) => {
  const tx = getTx(req.params.id);
  if (!tx) {
    res.status(404).json({ ok: false, error: "Transaction not found" });
    return;
  }
  res.json({ ok: true, tx });
});

// ─── GET /tx/history/:wallet ───────────────────────────────────────────────────
// Last 20 relayed txs for a wallet
router.get("/history/:wallet", (req, res) => {
  const { wallet } = req.params;
  if (!wallet?.startsWith("0x")) {
    res.status(400).json({ ok: false, error: "Invalid wallet" });
    return;
  }
  const txs = getTxHistory(wallet);
  res.json({ ok: true, txs });
});

export default router;
