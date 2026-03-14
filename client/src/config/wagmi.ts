import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";

// Web3Ads contract addresses (update after deployment)
export const CONTRACT_ADDRESSES = {
  // Base Sepolia (testnet)
  baseSepolia: {
    web3AdsCore: "0x0000000000000000000000000000000000000000", // TODO: Update after deploy
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Base Sepolia USDC
  },
  // Base Mainnet
  base: {
    web3AdsCore: "0x0000000000000000000000000000000000000000", // TODO: Update after deploy
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Base Mainnet USDC
  },
} as const;

// RainbowKit + wagmi config
export const config = getDefaultConfig({
  appName: "Web3Ads",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID",
  chains: [baseSepolia, base],
  transports: {
    [baseSepolia.id]: http(
      import.meta.env.VITE_BASE_SEPOLIA_RPC || "https://sepolia.base.org"
    ),
    [base.id]: http("https://mainnet.base.org"),
  },
  ssr: false,
});

// Get contract address for current chain
export function getContractAddress(
  chainId: number,
  contract: "web3AdsCore" | "usdc"
): `0x${string}` {
  if (chainId === baseSepolia.id) {
    return CONTRACT_ADDRESSES.baseSepolia[contract] as `0x${string}`;
  }
  if (chainId === base.id) {
    return CONTRACT_ADDRESSES.base[contract] as `0x${string}`;
  }
  // Default to Base Sepolia for unknown chains
  return CONTRACT_ADDRESSES.baseSepolia[contract] as `0x${string}`;
}
