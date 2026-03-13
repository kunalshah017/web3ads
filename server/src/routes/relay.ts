import { type Router, Router as ExpressRouter } from "express";
import { relayTransaction, getTx, getTxHistory, type ForwardRequest } from "../services/relayer.js";
import { gasToAdDuration, MAX_SPONSORED_GAS, MAX_AD_DURATION } from "../services/gasConfig.js";

const router: Router = ExpressRouter();

// ─── POST /tx/estimate ─────────────────────────────────────────────────────────
// Body: { to: address, data: hex, from: address }
// Returns gas estimate + how many seconds of ad the user needs to watch
router.post("/estimate", async (req, res) => {
  const { to, data, from } = req.body as { to?: string; data?: string; from?: string };

  if (!to || !from) {
    res.status(400).json({ ok: false, error: "to and from are required" });
    return;
  }

  try {
    // Use viem to estimate gas
    const { createPublicClient, http } = await import("viem");
    const { baseSepolia } = await import("viem/chains");

    const client = createPublicClient({
      chain: baseSepolia,
      transport: http(process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org"),
    });

    const gasEstimate = await client.estimateGas({
      account: from as `0x${string}`,
      to: to as `0x${string}`,
      data: (data || "0x") as `0x${string}`,
    });

    const gas = Number(gasEstimate);

    if (gas > MAX_SPONSORED_GAS) {
      res.status(400).json({
        ok: false,
        error: `Transaction requires ${gas.toLocaleString()} gas — exceeds max sponsored limit of ${MAX_SPONSORED_GAS.toLocaleString()}`,
        gasEstimate: gas,
        maxSponsored: MAX_SPONSORED_GAS,
      });
      return;
    }

    const adDuration = gasToAdDuration(gas);

    res.json({
      ok: true,
      gasEstimate: gas,
      adDurationSeconds: adDuration,
      maxAdDuration: MAX_AD_DURATION,
      maxSponsoredGas: MAX_SPONSORED_GAS,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Gas estimation failed";
    res.status(500).json({ ok: false, error: msg });
  }
});

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
router.get("/:id/status", async (req, res) => {
  const tx = await getTx(req.params.id);
  if (!tx) {
    res.status(404).json({ ok: false, error: "Transaction not found" });
    return;
  }
  res.json({ ok: true, tx });
});

// ─── GET /tx/history/:wallet ───────────────────────────────────────────────────
// Last 20 relayed txs for a wallet
router.get("/history/:wallet", async (req, res) => {
  const { wallet } = req.params;
  if (!wallet?.startsWith("0x")) {
    res.status(400).json({ ok: false, error: "Invalid wallet" });
    return;
  }
  const txs = await getTxHistory(wallet);
  res.json({ ok: true, txs });
});

export default router;
