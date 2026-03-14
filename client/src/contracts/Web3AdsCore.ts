export const WEB3ADS_CORE_ABI = [
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
    name: "CampaignFunded",
    inputs: [
      { name: "advertiser", type: "address", indexed: true },
      { name: "campaignId", type: "bytes32", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
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
    name: "paymentToken",
    inputs: [],
    outputs: [{ type: "address" }],
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

  // Write functions
  {
    type: "function",
    name: "createCampaign",
    inputs: [
      { name: "campaignId", type: "bytes32" },
      { name: "adType", type: "uint8" },
      { name: "cpmRate", type: "uint256" },
      { name: "budget", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "fundCampaign",
    inputs: [
      { name: "campaignId", type: "bytes32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
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
    name: "withdrawPublisher",
    inputs: [],
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

// CPM rates in USDC (6 decimals) per 1000 impressions
export const CPM_RATES = {
  [AdType.BANNER]: 2_000_000, // $2 CPM
  [AdType.SQUARE]: 3_000_000, // $3 CPM
  [AdType.SIDEBAR]: 4_000_000, // $4 CPM
  [AdType.INTERSTITIAL]: 8_000_000, // $8 CPM
} as const;

export const AD_TYPE_LABELS = {
  [AdType.BANNER]: "BANNER (728x90)",
  [AdType.SQUARE]: "SQUARE (300x300)",
  [AdType.SIDEBAR]: "SIDEBAR (300x600)",
  [AdType.INTERSTITIAL]: "INTERSTITIAL",
} as const;
