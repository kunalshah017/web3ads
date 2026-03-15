import {
  useWriteContract,
  useReadContract,
  useAccount,
  useWaitForTransactionReceipt,
  useBalance,
} from "wagmi";
import { parseEther, keccak256, toHex, formatEther } from "viem";
import { readContract } from "wagmi/actions";
import { config } from "../config/wagmi";
import {
  WEB3ADS_CORE_V2_ABI,
  CPM_RATES_ETH,
  WEB3ADS_V2_ADDRESSES,
} from "../contracts/Web3AdsCoreV2";
import { useCallback } from "react";

/**
 * Get V2 contract address for chain
 */
export function getV2ContractAddress(
  chainId: number | undefined,
): `0x${string}` | undefined {
  if (!chainId) return undefined;
  return WEB3ADS_V2_ADDRESSES[chainId as keyof typeof WEB3ADS_V2_ADDRESSES];
}

/**
 * Hook to get ETH balance for advertiser campaigns
 */
export function useETHBalance() {
  const { address, chainId } = useAccount();

  const { data: balance, refetch: refetchBalance } = useBalance({
    address,
  });

  return {
    balance: balance?.value,
    refetchBalance,
    formattedBalance: balance ? formatEther(balance.value) : "0.00",
    chainId,
  };
}

/**
 * Hook to create and fund campaign in V2 (ETH-based)
 * In V2, createCampaign is payable - you send ETH directly
 */
export function useCreateCampaignV2() {
  const { chainId } = useAccount();
  const contractAddress = getV2ContractAddress(chainId);

  const {
    writeContract,
    data: hash,
    isPending,
    error,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const createCampaign = useCallback(
    (params: {
      campaignId: `0x${string}`;
      adType: number;
      budgetETH: string;
    }) => {
      if (!contractAddress) return;

      const budgetWei = parseEther(params.budgetETH);

      writeContract({
        address: contractAddress,
        abi: WEB3ADS_CORE_V2_ABI,
        functionName: "createCampaign",
        args: [params.campaignId, params.adType],
        value: budgetWei,
      });
    },
    [writeContract, contractAddress],
  );

  return {
    createCampaign,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
    reset,
  };
}

/**
 * Hook to activate campaign in V2
 */
export function useActivateCampaignV2() {
  const { chainId } = useAccount();
  const contractAddress = getV2ContractAddress(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const activateCampaign = useCallback(
    (campaignId: `0x${string}`) => {
      if (!contractAddress) return;

      writeContract({
        address: contractAddress,
        abi: WEB3ADS_CORE_V2_ABI,
        functionName: "activateCampaign",
        args: [campaignId],
      });
    },
    [writeContract, contractAddress],
  );

  return {
    activateCampaign,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Hook to pause campaign in V2
 */
export function usePauseCampaignV2() {
  const { chainId } = useAccount();
  const contractAddress = getV2ContractAddress(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const pauseCampaign = useCallback(
    (campaignId: `0x${string}`) => {
      if (!contractAddress) return;

      writeContract({
        address: contractAddress,
        abi: WEB3ADS_CORE_V2_ABI,
        functionName: "pauseCampaign",
        args: [campaignId],
      });
    },
    [writeContract, contractAddress],
  );

  return {
    pauseCampaign,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Hook to withdraw remaining budget from a paused campaign
 */
export function useWithdrawCampaignBudgetV2() {
  const { chainId } = useAccount();
  const contractAddress = getV2ContractAddress(chainId);

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const withdrawBudget = useCallback(
    (campaignId: `0x${string}`) => {
      if (!contractAddress) return;

      writeContract({
        address: contractAddress,
        abi: WEB3ADS_CORE_V2_ABI,
        functionName: "withdrawCampaignBudget",
        args: [campaignId],
      });
    },
    [writeContract, contractAddress],
  );

  return {
    withdrawBudget,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Hook to get campaign details from V2 contract
 */
export function useCampaignV2(
  advertiser: `0x${string}` | undefined,
  campaignId: `0x${string}` | undefined,
) {
  const { chainId } = useAccount();
  const contractAddress = getV2ContractAddress(chainId);

  const { data, refetch, isLoading } = useReadContract({
    address: contractAddress,
    abi: WEB3ADS_CORE_V2_ABI,
    functionName: "campaigns",
    args: advertiser && campaignId ? [advertiser, campaignId] : undefined,
    query: { enabled: !!advertiser && !!campaignId && !!contractAddress },
  });

  return {
    campaign: data
      ? {
          advertiser: data[0],
          adType: data[1],
          cpmRate: data[2],
          budget: data[3],
          spent: data[4],
          status: data[5],
          createdAt: data[6],
        }
      : null,
    refetch,
    isLoading,
  };
}

/**
 * Hook to get publisher balance from V2 contract
 */
export function usePublisherBalanceV2(publisher: `0x${string}` | undefined) {
  const { chainId } = useAccount();
  const contractAddress = getV2ContractAddress(chainId);

  const { data, refetch, isLoading } = useReadContract({
    address: contractAddress,
    abi: WEB3ADS_CORE_V2_ABI,
    functionName: "getPublisherBalance",
    args: publisher ? [publisher] : undefined,
    query: { enabled: !!publisher && !!contractAddress },
  });

  return {
    balance: data as bigint | undefined,
    formattedBalance: data ? formatEther(data as bigint) : "0.00",
    refetch,
    isLoading,
  };
}

/**
 * Hook to get viewer balance from V2 contract
 */
export function useViewerBalanceV2(commitment: `0x${string}` | undefined) {
  const { chainId } = useAccount();
  const contractAddress = getV2ContractAddress(chainId);

  const { data, refetch, isLoading } = useReadContract({
    address: contractAddress,
    abi: WEB3ADS_CORE_V2_ABI,
    functionName: "getViewerBalance",
    args: commitment ? [commitment] : undefined,
    query: { enabled: !!commitment && !!contractAddress },
  });

  return {
    balance: data as bigint | undefined,
    formattedBalance: data ? formatEther(data as bigint) : "0.00",
    refetch,
    isLoading,
  };
}

/**
 * Generate a unique campaign ID from name
 * IMPORTANT: Must be deterministic so same name = same ID
 * This allows us to reference the same campaign across sessions
 */
export function generateCampaignId(
  name: string,
  walletAddress?: string,
): `0x${string}` {
  // Use wallet address + name for uniqueness, but deterministic
  const input = `${walletAddress || "0x"}-${name}`.toLowerCase();
  return keccak256(toHex(input));
}

/**
 * Calculate estimated impressions for a budget
 */
export function calculateImpressions(
  budgetETH: string,
  adType: number,
): number {
  const budgetWei = parseEther(budgetETH || "0");
  const cpmRate = CPM_RATES_ETH[adType as keyof typeof CPM_RATES_ETH];

  if (!cpmRate) return 0;

  // impressions = (budget / cpm) * 1000
  return Number((budgetWei * 1000n) / cpmRate);
}

/**
 * Format ETH to USD (approximate at $2000/ETH)
 */
export function ethToUsd(ethAmount: string | number): string {
  const eth = typeof ethAmount === "string" ? parseFloat(ethAmount) : ethAmount;
  if (isNaN(eth) || !eth) return "0.00";
  return (eth * 2000).toFixed(2);
}

/**
 * Check if a campaign already exists on the blockchain
 * Returns campaign data if exists, null otherwise
 */
export async function checkCampaignExists(
  chainId: number,
  advertiser: `0x${string}`,
  campaignId: `0x${string}`,
): Promise<{
  exists: boolean;
  status: number;
  budget: bigint;
} | null> {
  const contractAddress = getV2ContractAddress(chainId);
  if (!contractAddress) return null;

  try {
    const data = await readContract(config, {
      address: contractAddress,
      abi: WEB3ADS_CORE_V2_ABI,
      functionName: "campaigns",
      args: [advertiser, campaignId],
    });

    // data[6] is createdAt - if it's 0, campaign doesn't exist
    const createdAt = data[6];
    if (createdAt === 0n) {
      return { exists: false, status: 0, budget: 0n };
    }

    return {
      exists: true,
      status: Number(data[5]), // status
      budget: data[3], // budget
    };
  } catch (err) {
    console.error("Error checking campaign:", err);
    return null;
  }
}
