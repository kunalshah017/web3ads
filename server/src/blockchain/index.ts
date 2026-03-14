import {
  createWalletClient,
  createPublicClient,
  http,
  keccak256,
  encodePacked,
  type Hash,
  parseAbi,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import dotenv from "dotenv";

dotenv.config();

// Contract ABI (only the functions we need)
const WEB3ADS_CORE_ABI = parseAbi([
  "function recordImpression(address advertiser, bytes32 campaignId, address publisher, bytes32 viewerCommitment, bytes32 nullifier, bytes signature) external",
  "function getPublisherBalance(address publisher) view returns (uint256)",
  "function getViewerBalance(bytes32 commitment) view returns (uint256)",
  "function campaigns(address advertiser, bytes32 campaignId) view returns (address, uint8, uint256, uint256, uint256, uint8, uint256)",
]);

// V2 Contract ABI (ETH-based with gasless support)
const WEB3ADS_CORE_V2_ABI = parseAbi([
  "function recordImpression(address advertiser, bytes32 campaignId, address publisher, bytes32 viewerCommitment, bytes32 nullifier, bytes signature) external",
  "function withdrawViewer(bytes32 commitment, address recipient, bytes proof) external",
  "function withdrawPublisher() external",
  "function withdrawPublisherTo(address publisher, address recipient, bytes proof) external",
  "function getPublisherBalance(address publisher) view returns (uint256)",
  "function getViewerBalance(bytes32 commitment) view returns (uint256)",
  "function campaigns(address advertiser, bytes32 campaignId) view returns (address, uint8, uint256, uint256, uint256, uint8, uint256)",
]);

// Environment variables
const BACKEND_SIGNER_PRIVATE_KEY = process.env
  .BACKEND_SIGNER_PRIVATE_KEY as `0x${string}`;
const WEB3ADS_CORE_ADDRESS = process.env.WEB3ADS_CORE_ADDRESS as `0x${string}`;
const WEB3ADS_CORE_V2_ADDRESS = process.env
  .WEB3ADS_CORE_V2_ADDRESS as `0x${string}`;
const BASE_SEPOLIA_RPC_URL =
  process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org";

// Validate environment
if (!BACKEND_SIGNER_PRIVATE_KEY) {
  console.warn(
    "[Blockchain] BACKEND_SIGNER_PRIVATE_KEY not set - on-chain features disabled",
  );
}

if (!WEB3ADS_CORE_ADDRESS) {
  console.warn(
    "[Blockchain] WEB3ADS_CORE_ADDRESS not set - on-chain features disabled",
  );
}

// Create signer account
let signerAccount: ReturnType<typeof privateKeyToAccount> | null = null;

if (BACKEND_SIGNER_PRIVATE_KEY && WEB3ADS_CORE_ADDRESS) {
  signerAccount = privateKeyToAccount(BACKEND_SIGNER_PRIVATE_KEY);
  console.log(`[Blockchain] Initialized with signer: ${signerAccount.address}`);
  console.log(`[Blockchain] Contract: ${WEB3ADS_CORE_ADDRESS}`);
}

/**
 * Sign an impression for on-chain verification
 * The signature proves the backend authorized this impression
 */
export async function signImpression(params: {
  advertiser: `0x${string}`;
  campaignId: `0x${string}`;
  publisher: `0x${string}`;
  viewerCommitment: `0x${string}`;
  nullifier: `0x${string}`;
}): Promise<`0x${string}` | null> {
  if (!signerAccount) {
    console.warn("[Blockchain] Cannot sign - signer not configured");
    return null;
  }

  const { advertiser, campaignId, publisher, viewerCommitment, nullifier } =
    params;

  // Create message hash (must match contract's verification)
  const messageHash = keccak256(
    encodePacked(
      ["address", "bytes32", "address", "bytes32", "bytes32"],
      [advertiser, campaignId, publisher, viewerCommitment, nullifier],
    ),
  );

  // Sign with Ethereum Signed Message prefix
  const signature = await signerAccount.signMessage({
    message: { raw: messageHash },
  });

  return signature;
}

/**
 * Record impression on-chain (optional - for full on-chain flow)
 * This submits the transaction to the blockchain
 */
export async function recordImpressionOnChain(params: {
  advertiser: `0x${string}`;
  campaignId: `0x${string}`;
  publisher: `0x${string}`;
  viewerCommitment: `0x${string}`;
  nullifier: `0x${string}`;
}): Promise<Hash | null> {
  if (!signerAccount || !WEB3ADS_CORE_ADDRESS) {
    console.warn("[Blockchain] Cannot record on-chain - not configured");
    return null;
  }

  try {
    const signature = await signImpression(params);
    if (!signature) return null;

    const { advertiser, campaignId, publisher, viewerCommitment, nullifier } =
      params;

    // Create wallet client on-demand
    const walletClient = createWalletClient({
      account: signerAccount,
      chain: baseSepolia,
      transport: http(BASE_SEPOLIA_RPC_URL),
    });

    const hash = await walletClient.writeContract({
      address: WEB3ADS_CORE_ADDRESS,
      abi: WEB3ADS_CORE_ABI,
      functionName: "recordImpression",
      args: [
        advertiser,
        campaignId,
        publisher,
        viewerCommitment,
        nullifier,
        signature,
      ],
      chain: baseSepolia,
    });

    console.log(`[Blockchain] Impression recorded on-chain: ${hash}`);
    return hash;
  } catch (error) {
    console.error("[Blockchain] Failed to record impression on-chain:", error);
    return null;
  }
}

/**
 * Get publisher balance from contract
 */
export async function getPublisherBalanceOnChain(
  publisher: `0x${string}`,
): Promise<bigint | null> {
  if (!WEB3ADS_CORE_ADDRESS) return null;

  try {
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(BASE_SEPOLIA_RPC_URL),
    });

    const balance = await publicClient.readContract({
      address: WEB3ADS_CORE_ADDRESS,
      abi: WEB3ADS_CORE_ABI,
      functionName: "getPublisherBalance",
      args: [publisher],
    });

    return balance as bigint;
  } catch (error) {
    console.error("[Blockchain] Failed to get publisher balance:", error);
    return null;
  }
}

/**
 * Get viewer balance from contract
 */
export async function getViewerBalanceOnChain(
  commitment: `0x${string}`,
): Promise<bigint | null> {
  if (!WEB3ADS_CORE_ADDRESS) return null;

  try {
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(BASE_SEPOLIA_RPC_URL),
    });

    const balance = await publicClient.readContract({
      address: WEB3ADS_CORE_ADDRESS,
      abi: WEB3ADS_CORE_ABI,
      functionName: "getViewerBalance",
      args: [commitment],
    });

    return balance as bigint;
  } catch (error) {
    console.error("[Blockchain] Failed to get viewer balance:", error);
    return null;
  }
}

/**
 * Sign a viewer withdrawal request
 * The signature proves the backend authorized this withdrawal
 */
export async function signViewerWithdrawal(params: {
  commitment: `0x${string}`;
  recipient: `0x${string}`;
}): Promise<`0x${string}` | null> {
  if (!signerAccount) {
    console.warn("[Blockchain] Cannot sign - signer not configured");
    return null;
  }

  const { commitment, recipient } = params;

  // Create message hash (must match contract's verification)
  const messageHash = keccak256(
    encodePacked(["bytes32", "address"], [commitment, recipient]),
  );

  // Sign with Ethereum Signed Message prefix
  const signature = await signerAccount.signMessage({
    message: { raw: messageHash },
  });

  return signature;
}

/**
 * Withdraw viewer earnings on-chain (backend pays gas)
 * @param commitment Viewer's semaphore commitment
 * @param recipient Address to receive the ETH
 */
export async function withdrawViewerOnChain(params: {
  commitment: `0x${string}`;
  recipient: `0x${string}`;
}): Promise<Hash | null> {
  if (!signerAccount || !WEB3ADS_CORE_V2_ADDRESS) {
    console.warn("[Blockchain] Cannot withdraw - V2 contract not configured");
    return null;
  }

  try {
    const { commitment, recipient } = params;

    // Sign the withdrawal
    const signature = await signViewerWithdrawal({ commitment, recipient });
    if (!signature) return null;

    // Create wallet client
    const walletClient = createWalletClient({
      account: signerAccount,
      chain: baseSepolia,
      transport: http(BASE_SEPOLIA_RPC_URL),
    });

    // Execute withdrawal (backend pays gas)
    const hash = await walletClient.writeContract({
      address: WEB3ADS_CORE_V2_ADDRESS,
      abi: WEB3ADS_CORE_V2_ABI,
      functionName: "withdrawViewer",
      args: [commitment, recipient, signature],
      chain: baseSepolia,
    });

    console.log(`[Blockchain] Viewer withdrawal executed: ${hash}`);
    return hash;
  } catch (error) {
    console.error("[Blockchain] Failed to execute viewer withdrawal:", error);
    return null;
  }
}

/**
 * Sign a publisher withdrawal request
 * The signature proves the backend authorized this withdrawal
 */
export async function signPublisherWithdrawal(params: {
  publisher: `0x${string}`;
  recipient: `0x${string}`;
}): Promise<`0x${string}` | null> {
  if (!signerAccount) {
    console.warn("[Blockchain] Cannot sign - signer not configured");
    return null;
  }

  const { publisher, recipient } = params;

  // Create message hash (must match contract's verification)
  const messageHash = keccak256(
    encodePacked(["address", "address"], [publisher, recipient]),
  );

  // Sign with Ethereum Signed Message prefix
  const signature = await signerAccount.signMessage({
    message: { raw: messageHash },
  });

  return signature;
}

/**
 * Withdraw publisher earnings on-chain to custom recipient (backend pays gas)
 * @param publisher Publisher's wallet address
 * @param recipient Address to receive the ETH
 */
export async function withdrawPublisherOnChain(params: {
  publisher: `0x${string}`;
  recipient: `0x${string}`;
}): Promise<Hash | null> {
  if (!signerAccount || !WEB3ADS_CORE_V2_ADDRESS) {
    console.warn("[Blockchain] Cannot withdraw - V2 contract not configured");
    return null;
  }

  try {
    const { publisher, recipient } = params;

    // Sign the withdrawal
    const signature = await signPublisherWithdrawal({ publisher, recipient });
    if (!signature) return null;

    // Create wallet client
    const walletClient = createWalletClient({
      account: signerAccount,
      chain: baseSepolia,
      transport: http(BASE_SEPOLIA_RPC_URL),
    });

    // Execute withdrawal to custom recipient (backend pays gas)
    const hash = await walletClient.writeContract({
      address: WEB3ADS_CORE_V2_ADDRESS,
      abi: WEB3ADS_CORE_V2_ABI,
      functionName: "withdrawPublisherTo",
      args: [publisher, recipient, signature],
      chain: baseSepolia,
    });

    console.log(`[Blockchain] Publisher withdrawal executed: ${hash}`);
    return hash;
  } catch (error) {
    console.error(
      "[Blockchain] Failed to execute publisher withdrawal:",
      error,
    );
    return null;
  }
}

/**
 * Check if blockchain integration is enabled
 */
export function isBlockchainEnabled(): boolean {
  return !!(signerAccount && WEB3ADS_CORE_ADDRESS);
}

/**
 * Check if V2 blockchain integration is enabled
 */
export function isBlockchainV2Enabled(): boolean {
  return !!(signerAccount && WEB3ADS_CORE_V2_ADDRESS);
}

export {
  signerAccount,
  WEB3ADS_CORE_ADDRESS,
  WEB3ADS_CORE_ABI,
  WEB3ADS_CORE_V2_ADDRESS,
  WEB3ADS_CORE_V2_ABI,
};
