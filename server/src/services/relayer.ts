import { createPublicClient, createWalletClient, http, parseGwei } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { randomUUID } from "crypto";
import db from "../db/index.js";
import { spendCredits } from "./credits.js";

// Gas cost estimate for a forwarder execute call
// This covers the forwarder overhead + a typical target call
const GAS_COST_ESTIMATE = 150_000; // credits consumed per relay

const FORWARDER_ABI = [
  {
    name: "execute",
    type: "function",
    stateMutability: "payable",
    inputs: [
      {
        name: "req",
        type: "tuple",
        components: [
          { name: "from",  type: "address" },
          { name: "to",    type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas",   type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data",  type: "bytes"   },
        ],
      },
      { name: "sig", type: "bytes" },
    ],
    outputs: [
      { name: "success", type: "bool" },
      { name: "result",  type: "bytes" },
    ],
  },
  {
    name: "verify",
    type: "function",
    stateMutability: "view",
    inputs: [
      {
        name: "req",
        type: "tuple",
        components: [
          { name: "from",  type: "address" },
          { name: "to",    type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas",   type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data",  type: "bytes"   },
        ],
      },
      { name: "sig", type: "bytes" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "nonces",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ─── Setup clients ─────────────────────────────────────────────────────────────

function getRelayerAccount() {
  const key = process.env.RELAYER_PRIVATE_KEY;
  if (!key) throw new Error("RELAYER_PRIVATE_KEY not set in .env");
  return privateKeyToAccount(key as `0x${string}`);
}

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org"),
});

const walletClient = createWalletClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org"),
});

// ─── DB queries ────────────────────────────────────────────────────────────────

const insertTx = db.prepare<[string, string, string]>(
  `INSERT INTO relayed_txs (id, wallet, status, credits_used, created_at, updated_at)
   VALUES (?, ?, 'pending', ?, unixepoch(), unixepoch())`
);

const updateTx = db.prepare<[string, string, string | null, string]>(
  `UPDATE relayed_txs SET status = ?, tx_hash = ?, error = ?, updated_at = unixepoch() WHERE id = ?`
);

const getTxById = db.prepare<[string]>(
  `SELECT * FROM relayed_txs WHERE id = ?`
);

const getTxsByWallet = db.prepare<[string]>(
  `SELECT * FROM relayed_txs WHERE wallet = ? ORDER BY created_at DESC LIMIT 20`
);

// ─── ForwardRequest type ───────────────────────────────────────────────────────

export interface ForwardRequest {
  from:  string;
  to:    string;
  value: string; // bigint as string
  gas:   string;
  nonce: string;
  data:  string;
}

// ─── Public API ────────────────────────────────────────────────────────────────

export function getTx(id: string) {
  return getTxById.get(id) ?? null;
}

export function getTxHistory(wallet: string) {
  return getTxsByWallet.all(wallet.toLowerCase());
}

/**
 * Relay a signed meta-transaction.
 * 1. Verify signature on-chain via Forwarder.verify()
 * 2. Deduct credits from user
 * 3. Broadcast via Forwarder.execute()
 * 4. Return tx record id + tx hash
 */
export async function relayTransaction(
  req: ForwardRequest,
  sig: string
): Promise<{ id: string; txHash: string | null; error?: string }> {
  const forwarderAddress = process.env.FORWARDER_ADDRESS as `0x${string}`;
  if (!forwarderAddress) throw new Error("FORWARDER_ADDRESS not set in .env");

  const wallet = req.from.toLowerCase();
  const txId = randomUUID();

  // 1. Verify signature on-chain (read call, free)
  const reqFormatted = {
    from:  req.from  as `0x${string}`,
    to:    req.to    as `0x${string}`,
    value: BigInt(req.value),
    gas:   BigInt(req.gas),
    nonce: BigInt(req.nonce),
    data:  req.data  as `0x${string}`,
  };

  const isValid = await publicClient.readContract({
    address: forwarderAddress,
    abi: FORWARDER_ABI,
    functionName: "verify",
    args: [reqFormatted, sig as `0x${string}`],
  });

  if (!isValid) {
    return { id: txId, txHash: null, error: "Invalid signature or nonce" };
  }

  // 2. Deduct credits (fail fast if insufficient)
  const hasCredits = spendCredits(wallet, GAS_COST_ESTIMATE);
  if (!hasCredits) {
    return { id: txId, txHash: null, error: "Insufficient gas credits. Watch more ads!" };
  }

  // 3. Create pending record
  insertTx.run(txId, wallet, String(GAS_COST_ESTIMATE));

  // 4. Broadcast (async — don't await the confirmation)
  try {
    const account = getRelayerAccount();
    const hash = await walletClient.writeContract({
      address: forwarderAddress,
      abi: FORWARDER_ABI,
      functionName: "execute",
      args: [reqFormatted, sig as `0x${string}`],
      account,
      gas: BigInt(req.gas) + 50_000n, // buffer for forwarder overhead
      maxFeePerGas: parseGwei("0.1"),
      maxPriorityFeePerGas: parseGwei("0.01"),
    });

    updateTx.run("submitted", hash, "", txId);

    // Poll for confirmation in background
    publicClient.waitForTransactionReceipt({ hash }).then((receipt) => {
      const status = receipt.status === "success" ? "confirmed" : "failed";
      updateTx.run(status, hash, "", txId);
    }).catch((err: Error) => {
      updateTx.run("failed", "", err.message, txId);
    });

    return { id: txId, txHash: hash };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    updateTx.run("failed", "", msg, txId);
    // Refund credits since tx failed
    spendCredits(wallet, -GAS_COST_ESTIMATE); // negative spend = refund
    return { id: txId, txHash: null, error: msg };
  }
}
