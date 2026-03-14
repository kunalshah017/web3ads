import {
  useWriteContract,
  useReadContract,
  useAccount,
  useWaitForTransactionReceipt,
  useBalance,
} from "wagmi";
import { parseEther, keccak256, toHex, formatEther } from "viem";
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
 * Generate a unique campaign ID from name and timestamp
 */
export function generateCampaignId(name: string): `0x${string}` {
  const timestamp = Date.now();
  const input = `${name}-${timestamp}-${Math.random().toString(36).slice(2)}`;
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

  if (!cpmRate || cpmRate === 0n) return 0;

  // impressions = (budget / cpm) * 1000
  return Number((budgetWei * 1000n) / cpmRate);
}

/**
 * Format ETH to USD (approximate at $2000/ETH)
 */
export function ethToUsd(ethAmount: string | number): string {
  const eth = typeof ethAmount === "string" ? parseFloat(ethAmount) : ethAmount;
  return (eth * 2000).toFixed(2);
}
