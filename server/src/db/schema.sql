-- Web3Ads Gasless Backend Schema
-- SQLite — runs on first server start via db/index.ts

-- Track completed ad watches (prevents duplicate credit awards)
CREATE TABLE IF NOT EXISTS ad_watches (
  id          TEXT PRIMARY KEY,       -- uuid
  wallet      TEXT NOT NULL,          -- user wallet address (lowercased)
  ad_id       TEXT NOT NULL,          -- which ad was watched
  watched_at  INTEGER NOT NULL,       -- unix timestamp (seconds)
  ip_hash     TEXT NOT NULL           -- sha256 of IP for anti-fraud
);

-- Index for fast anti-fraud lookups
CREATE INDEX IF NOT EXISTS idx_watches_wallet_ad ON ad_watches (wallet, ad_id, watched_at);
CREATE INDEX IF NOT EXISTS idx_watches_ip ON ad_watches (ip_hash, watched_at);

-- Gas credit balance per wallet
CREATE TABLE IF NOT EXISTS gas_credits (
  wallet      TEXT PRIMARY KEY,       -- user wallet address (lowercased)
  credits     INTEGER NOT NULL DEFAULT 0,  -- cumulative gas units earned
  updated_at  INTEGER NOT NULL
);

-- Every relayed meta-transaction
CREATE TABLE IF NOT EXISTS relayed_txs (
  id              TEXT PRIMARY KEY,   -- uuid
  wallet          TEXT NOT NULL,      -- who requested the relay
  tx_hash         TEXT,               -- on-chain hash (null until submitted)
  status          TEXT NOT NULL,      -- 'pending' | 'submitted' | 'confirmed' | 'failed'
  credits_used    INTEGER NOT NULL,   -- gas units consumed for this tx
  error           TEXT,               -- error message if failed
  created_at      INTEGER NOT NULL,
  updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_txs_wallet ON relayed_txs (wallet, created_at);
