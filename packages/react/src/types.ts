/**
 * Ad type determines the size and CPM rate
 */
export type AdType = "banner" | "square" | "sidebar" | "interstitial";

/**
 * Props for the Web3Ad component
 */
export interface Web3AdProps {
  /**
   * Publisher's wallet address (receives 50% of ad revenue)
   */
  publisherWallet: `0x${string}`;

  /**
   * Type of ad to display
   * - banner: 728x90 ($2 CPM)
   * - square: 300x300 ($3 CPM)
   * - sidebar: 300x600 ($4 CPM)
   * - interstitial: fullscreen ($8 CPM)
   */
  type: AdType;

  /**
   * Optional category for ad targeting
   */
  category?: string;

  /**
   * Callback fired when an ad impression is recorded
   */
  onImpression?: (adId: string) => void;

  /**
   * Callback fired when ad is clicked
   */
  onClick?: (adId: string) => void;

  /**
   * Callback fired on error
   */
  onError?: (error: Error) => void;

  /**
   * Custom CSS class name
   */
  className?: string;

  /**
   * Whether to show a fallback when no ad is available
   * @default true
   */
  showFallback?: boolean;

  /**
   * Test mode - shows placeholder instead of real ad
   * @default false
   */
  testMode?: boolean;
}

/**
 * Ad data returned from the API
 */
export interface AdData {
  id: string;
  campaignId: string;
  advertiser: string;
  imageUrl: string;
  targetUrl: string;
  type: AdType;
  cpmRate: number;
}

/**
 * Impression request payload
 */
export interface ImpressionPayload {
  adId: string;
  campaignId: string;
  publisherWallet: string;
  viewerCommitment?: string; // Set by extension if present
  timestamp: number;
  pageUrl: string;
  viewDuration: number;
}

/**
 * Ad dimensions by type
 */
export const AD_DIMENSIONS: Record<AdType, { width: number; height: number }> = {
  banner: { width: 728, height: 90 },
  square: { width: 300, height: 300 },
  sidebar: { width: 300, height: 600 },
  interstitial: { width: 640, height: 480 },
};
