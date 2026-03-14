import type { AdData, AdType, ImpressionPayload } from "./types";

/**
 * Default API URL - can be overridden with setApiUrl()
 */
export let WEB3ADS_API_URL = "https://api.web3ads.io";

/**
 * Set custom API URL (for self-hosted or testing)
 */
export function setApiUrl(url: string): void {
  WEB3ADS_API_URL = url;
}

/**
 * Fetch an ad from the API
 */
export async function fetchAd(params: {
  publisherWallet: string;
  type: AdType;
  category?: string;
}): Promise<AdData | null> {
  try {
    const searchParams = new URLSearchParams({
      publisher: params.publisherWallet,
      type: params.type,
      ...(params.category && { category: params.category }),
    });

    const response = await fetch(`${WEB3ADS_API_URL}/api/ads/serve?${searchParams}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No ad available
      }
      throw new Error(`Failed to fetch ad: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("[Web3Ads] Error fetching ad:", error);
    return null;
  }
}

/**
 * Record an impression
 */
export async function recordImpression(payload: ImpressionPayload): Promise<boolean> {
  try {
    const response = await fetch(`${WEB3ADS_API_URL}/api/ads/impression`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to record impression: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error("[Web3Ads] Error recording impression:", error);
    return false;
  }
}

/**
 * Check if the Web3Ads extension is installed
 */
export function isExtensionInstalled(): boolean {
  // Extension injects a global flag
  return typeof window !== "undefined" && !!(window as typeof window & { __WEB3ADS_EXTENSION__: boolean }).__WEB3ADS_EXTENSION__;
}

/**
 * Request viewer commitment from extension
 */
export async function getViewerCommitment(): Promise<string | undefined> {
  if (!isExtensionInstalled()) {
    return undefined;
  }

  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "WEB3ADS_COMMITMENT_RESPONSE") {
        window.removeEventListener("message", handler);
        resolve(event.data.commitment);
      }
    };

    window.addEventListener("message", handler);

    // Request commitment from extension
    window.postMessage({ type: "WEB3ADS_GET_COMMITMENT" }, "*");

    // Timeout after 1 second
    setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve(undefined);
    }, 1000);
  });
}
