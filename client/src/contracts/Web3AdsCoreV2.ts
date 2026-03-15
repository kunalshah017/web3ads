// Web3AdsCoreV2 - ETH-based contract
// Deployed on Base Sepolia: 0xff7DB767900a8151a1D55b3cC4C72Eb0DA482d1F

export const WEB3ADS_CORE_V2_ABI = [
  // Events
  {
    type: "event",
    name: "CampaignCreated",
    inputs: [
      { name: "advertiser", type: "address", indexed: true },
      { name: "campaignId", type: "bytes32", indexed: true },
      { name: "adType", type: "uint8", indexed: false },
      { name: "cpmRate", type: "uint256", indexed: false },
      { name: "budget", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "CampaignStatusChanged",
    inputs: [
      { name: "campaignId", type: "bytes32", indexed: true },
      { name: "newStatus", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ImpressionRecorded",
    inputs: [
      { name: "campaignId", type: "bytes32", indexed: true },
      { name: "publisher", type: "address", indexed: true },
      { name: "viewerCommitment", type: "bytes32", indexed: false },
      { name: "publisherEarning", type: "uint256", indexed: false },
      { name: "viewerEarning", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "PublisherWithdrawal",
    inputs: [
      { name: "publisher", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "ViewerWithdrawal",
    inputs: [
      { name: "commitment", type: "bytes32", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },

  // View functions
  {
    type: "function",
    name: "PUBLISHER_SHARE",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "VIEWER_SHARE",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "PLATFORM_SHARE",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "MIN_WITHDRAWAL",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "CPM_BANNER",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "CPM_SQUARE",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "CPM_SIDEBAR",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "CPM_INTERSTITIAL",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "campaigns",
    inputs: [
      { name: "advertiser", type: "address" },
      { name: "campaignId", type: "bytes32" },
    ],
    outputs: [
      { name: "advertiser", type: "address" },
      { name: "adType", type: "uint8" },
      { name: "cpmRate", type: "uint256" },
      { name: "budget", type: "uint256" },
      { name: "spent", type: "uint256" },
      { name: "status", type: "uint8" },
      { name: "createdAt", type: "uint256" },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "publisherBalances",
    inputs: [{ name: "publisher", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "viewerBalances",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "platformBalance",
    inputs: [],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getPublisherBalance",
    inputs: [{ name: "publisher", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "getViewerBalance",
    inputs: [{ name: "commitment", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },

  // Write functions - V2 uses payable for ETH deposits
  {
    type: "function",
    name: "createCampaign",
    inputs: [
      { name: "campaignId", type: "bytes32" },
      { name: "adType", type: "uint8" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "activateCampaign",
    inputs: [{ name: "campaignId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "pauseCampaign",
    inputs: [{ name: "campaignId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawCampaignBudget",
    inputs: [{ name: "campaignId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawPublisher",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawPublisherTo",
    inputs: [
      { name: "publisher", type: "address" },
      { name: "recipient", type: "address" },
      { name: "proof", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "withdrawViewer",
    inputs: [
      { name: "commitment", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "proof", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// Ad types enum matching the contract
export const AdType = {
  BANNER: 0,
  SQUARE: 1,
  SIDEBAR: 2,
  INTERSTITIAL: 3,
} as const;

// Demo CPM rates in ETH (wei) - 500x inflated for hackathon demo
// At $2000/ETH, 0.5 ETH = $1000 CPM (viewer earns $200 per 1000 impressions = $0.20 per view)
export const CPM_RATES_ETH = {
  [AdType.BANNER]: 500000000000000000n, // 0.5 ETH = $1000 CPM
  [AdType.SQUARE]: 750000000000000000n, // 0.75 ETH = $1500 CPM
  [AdType.SIDEBAR]: 1000000000000000000n, // 1.0 ETH = $2000 CPM
  [AdType.INTERSTITIAL]: 2000000000000000000n, // 2.0 ETH = $4000 CPM
} as const;

// Human-readable labels
export const AD_TYPE_LABELS = {
  [AdType.BANNER]: "BANNER (728x90)",
  [AdType.SQUARE]: "SQUARE (300x300)",
  [AdType.SIDEBAR]: "SIDEBAR (300x600)",
  [AdType.INTERSTITIAL]: "INTERSTITIAL (800x600)",
} as const;

// Contract addresses on Base Sepolia
export const WEB3ADS_V2_ADDRESSES = {
  84532: "0xff7DB767900a8151a1D55b3cC4C72Eb0DA482d1F" as const, // Base Sepolia
} as const;

export const FORWARDER_ADDRESSES = {
  84532: "0x8Bc2D17889EF9d04AA620e7984D7E7f74305215E" as const, // Base Sepolia
} as const;
