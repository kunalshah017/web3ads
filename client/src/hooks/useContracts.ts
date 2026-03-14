import {
  useWriteContract,
  useReadContract,
  useAccount,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseUnits, keccak256, toHex } from "viem";
import { WEB3ADS_CORE_ABI, CPM_RATES } from "../contracts/Web3AdsCore";
import { ERC20_ABI } from "../contracts/ERC20";
import { getContractAddress } from "../config/wagmi";
import { useCallback } from "react";

/**
 * Hook to get USDC balance and allowance
 */
export function useUSDCBalance() {
  const { address, chainId } = useAccount();
  const web3adsAddress = chainId
    ? getContractAddress(chainId, "web3AdsCore")
    : undefined;
  const usdcAddress = chainId ? getContractAddress(chainId, "usdc") : undefined;

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!usdcAddress },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: usdcAddress,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address && web3adsAddress ? [address, web3adsAddress] : undefined,
    query: { enabled: !!address && !!web3adsAddress && !!usdcAddress },
  });

  return {
    balance: balance as bigint | undefined,
    allowance: allowance as bigint | undefined,
    refetchBalance,
    refetchAllowance,
    formattedBalance: balance ? (Number(balance) / 1e6).toFixed(2) : "0.00",
    formattedAllowance: allowance
      ? (Number(allowance) / 1e6).toFixed(2)
      : "0.00",
  };
}

/**
 * Hook to approve USDC spending
 */
export function useApproveUSDC() {
  const { chainId } = useAccount();
  const web3adsAddress = chainId
    ? getContractAddress(chainId, "web3AdsCore")
    : undefined;
  const usdcAddress = chainId ? getContractAddress(chainId, "usdc") : undefined;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const approve = useCallback(
    (amount: bigint) => {
      if (!usdcAddress || !web3adsAddress) return;

      writeContract({
        address: usdcAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [web3adsAddress, amount],
      });
    },
    [writeContract, usdcAddress, web3adsAddress],
  );

  return {
    approve,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
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
 * Hook to create a campaign with USDC deposit
 */
export function useCreateCampaign() {
  const { chainId } = useAccount();
  const contractAddress = chainId
    ? getContractAddress(chainId, "web3AdsCore")
    : undefined;

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
      budgetUSDC: number;
    }) => {
      if (!contractAddress) return;

      const cpmRate = BigInt(
        CPM_RATES[params.adType as keyof typeof CPM_RATES],
      );
      const budget = parseUnits(params.budgetUSDC.toString(), 6);

      writeContract({
        address: contractAddress,
        abi: WEB3ADS_CORE_ABI,
        functionName: "createCampaign",
        args: [params.campaignId, params.adType, cpmRate, budget],
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
 * Hook to activate a campaign
 */
export function useActivateCampaign() {
  const { chainId } = useAccount();
  const contractAddress = chainId
    ? getContractAddress(chainId, "web3AdsCore")
    : undefined;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const activateCampaign = useCallback(
    (campaignId: `0x${string}`) => {
      if (!contractAddress) return;

      writeContract({
        address: contractAddress,
        abi: WEB3ADS_CORE_ABI,
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
 * Hook to get publisher balance
 */
export function usePublisherBalance() {
  const { address, chainId } = useAccount();
  const contractAddress = chainId
    ? getContractAddress(chainId, "web3AdsCore")
    : undefined;

  const { data: balance, refetch } = useReadContract({
    address: contractAddress,
    abi: WEB3ADS_CORE_ABI,
    functionName: "publisherBalances",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!contractAddress },
  });

  return {
    balance: balance as bigint | undefined,
    refetch,
    formattedBalance: balance ? (Number(balance) / 1e6).toFixed(2) : "0.00",
  };
}

/**
 * Hook for publisher withdrawal
 */
export function usePublisherWithdraw() {
  const { chainId } = useAccount();
  const contractAddress = chainId
    ? getContractAddress(chainId, "web3AdsCore")
    : undefined;

  const { writeContract, data: hash, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const withdraw = useCallback(() => {
    if (!contractAddress) return;

    writeContract({
      address: contractAddress,
      abi: WEB3ADS_CORE_ABI,
      functionName: "withdrawPublisher",
    });
  }, [writeContract, contractAddress]);

  return {
    withdraw,
    isPending,
    isConfirming,
    isSuccess,
    error,
    hash,
  };
}

/**
 * Hook to read campaign data
 */
export function useCampaign(
  advertiser: `0x${string}` | undefined,
  campaignId: `0x${string}` | undefined,
) {
  const { chainId } = useAccount();
  const contractAddress = chainId
    ? getContractAddress(chainId, "web3AdsCore")
    : undefined;

  const { data, refetch, isLoading } = useReadContract({
    address: contractAddress,
    abi: WEB3ADS_CORE_ABI,
    functionName: "campaigns",
    args: advertiser && campaignId ? [advertiser, campaignId] : undefined,
    query: { enabled: !!advertiser && !!campaignId && !!contractAddress },
  });

  const campaign = data
    ? {
        advertiser: data[0] as `0x${string}`,
        adType: data[1] as number,
        cpmRate: data[2] as bigint,
        budget: data[3] as bigint,
        spent: data[4] as bigint,
        status: data[5] as number,
        createdAt: data[6] as bigint,
      }
    : null;

  return {
    campaign,
    refetch,
    isLoading,
  };
}
