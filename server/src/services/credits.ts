import { createHash, randomUUID } from "crypto";
import db from "../db/index.js";

// How much gas credit one 30s ad watch gives
const CREDITS_PER_WATCH = parseInt(process.env.CREDITS_PER_WATCH || "50000");

// Anti-fraud: same wallet+ad combo blocks for 60s
const WATCH_COOLDOWN_SECONDS = 60;

// Anti-fraud: same IP can earn max 5 times per hour
const IP_MAX_PER_HOUR = 5;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreditRow {
  wallet: string;
  credits: number;
  updated_at: number;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

const getBalance = db.prepare<[string], CreditRow>(
  "SELECT * FROM gas_credits WHERE wallet = ?"
);

const upsertCredits = db.prepare<[string, number, number]>(
  `INSERT INTO gas_credits (wallet, credits, updated_at)
   VALUES (?, ?, ?)
   ON CONFLICT(wallet) DO UPDATE SET
     credits    = credits + excluded.credits,
     updated_at = excluded.updated_at`
);

const deductCredits = db.prepare<[number, number, string]>(
  `UPDATE gas_credits SET credits = credits - ?, updated_at = ? WHERE wallet = ?`
);

const recentWatchByWalletAd = db.prepare<[string, string, number], { count: number }>(
  `SELECT COUNT(*) as count FROM ad_watches
   WHERE wallet = ? AND ad_id = ? AND watched_at > ?`
);

const recentWatchByIp = db.prepare<[string, number], { count: number }>(
  `SELECT COUNT(*) as count FROM ad_watches WHERE ip_hash = ? AND watched_at > ?`
);

const insertWatch = db.prepare<[string, string, string, number, string]>(
  `INSERT INTO ad_watches (id, wallet, ad_id, watched_at, ip_hash) VALUES (?, ?, ?, ?, ?)`
);

// ─── Public API ───────────────────────────────────────────────────────────────

export function getCredits(wallet: string): number {
  const row = getBalance.get(wallet.toLowerCase());
  return row?.credits ?? 0;
}

export function hashIp(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Award credits for watching an ad.
 * Returns { ok, credits, reason } — reason is set on fraud detection.
 */
export function awardCredits(
  wallet: string,
  adId: string,
  rawIp: string
): { ok: boolean; credits?: number; reason?: string } {
  const w = wallet.toLowerCase();
  const ipHash = hashIp(rawIp);
  const now = Math.floor(Date.now() / 1000);

  // Fraud check 1: same wallet+ad combo in last 60s
  const recentSame = recentWatchByWalletAd.get(w, adId, now - WATCH_COOLDOWN_SECONDS)!;
  if (recentSame.count > 0) {
    return { ok: false, reason: "You already watched this ad recently. Wait a minute." };
  }

  // Fraud check 2: same IP more than 5 times in last hour
  const recentIp = recentWatchByIp.get(ipHash, now - 3600)!;
  if (recentIp.count >= IP_MAX_PER_HOUR) {
    return { ok: false, reason: "Too many watches from this IP. Try again later." };
  }

  // Record watch + award credits atomically
  db.transaction(() => {
    insertWatch.run(randomUUID(), w, adId, now, ipHash);
    upsertCredits.run(w, CREDITS_PER_WATCH, now);
  })();

  const newBalance = getCredits(w);
  return { ok: true, credits: newBalance };
}

/**
 * Attempt to deduct `amount` credits from wallet.
 * Returns false if insufficient balance.
 */
export function spendCredits(wallet: string, amount: number): boolean {
  const w = wallet.toLowerCase();
  const balance = getCredits(w);
  if (balance < amount) return false;
  deductCredits.run(amount, Math.floor(Date.now() / 1000), w);
  return true;
}
