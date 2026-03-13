const BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `POST ${path} failed`);
  }
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Ad {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  duration: number;
}

export interface CreditBalance {
  ok: boolean;
  wallet: string;
  credits: number;
  estimatedTxs: number;
  adsNeeded: number;
}

export interface TxRecord {
  id: string;
  wallet: string;
  tx_hash: string;
  status: "pending" | "submitted" | "confirmed" | "failed";
  credits_used: number;
  created_at: number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const api = {
  getNextAd: () => get<{ ok: boolean; ad: Ad }>("/ads/next"),

  watchedAd: (wallet: string, adId: string) =>
    post<{ ok: boolean; newBalance: number; earned: number }>("/ads/watched", {
      wallet,
      adId,
    }),

  getCredits: (wallet: string) =>
    get<CreditBalance>(`/credits/${wallet}`),

  estimateGas: (from: string, to: string, data?: string) =>
    post<{
      ok: boolean;
      gasEstimate: number;
      adDurationSeconds: number;
      maxSponsoredGas: number;
      error?: string;
    }>("/tx/estimate", { from, to, data }),

  relayTx: (request: object, sig: string) =>
    post<{ ok: boolean; id: string; txHash: string }>("/tx/relay", {
      request,
      sig,
    }),

  getTxStatus: (id: string) =>
    get<{ ok: boolean; tx: TxRecord }>(`/tx/${id}/status`),

  getTxHistory: (wallet: string) =>
    get<{ ok: boolean; txs: TxRecord[] }>(`/tx/history/${wallet}`),
};
