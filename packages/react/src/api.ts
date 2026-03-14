import type { AdData, AdType, ImpressionPayload } from "./types";

/**
 * Default API URL - can be overridden with setApiUrl()
 */
export let WEB3ADS_API_URL = "https://api.web3ads.wtf";

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

    const response = await fetch(
      `${WEB3ADS_API_URL}/api/ads/serve?${searchParams}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No ad available
      }
      throw new Error(`Failed to fetch ad: ${response.statusText}`);
    }

    const data = await response.json();
    return data.ad || null;
  } catch (error) {
    console.error("[Web3Ads] Error fetching ad:", error);
    return null;
  }
}

/**
 * Record an impression
 */
export async function recordImpression(
  payload: ImpressionPayload,
): Promise<boolean> {
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
 * Uses CSP-safe detection via data attribute
 */
export function isExtensionInstalled(): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  // Extension sets data attribute on document element (CSP-safe)
  return document.documentElement.hasAttribute("data-web3ads-extension");
}

/**
 * Check extension with message fallback (async)
 */
export async function checkExtensionAsync(): Promise<boolean> {
  // First check data attribute
  if (isExtensionInstalled()) {
    return true;
  }

  // Fallback: request confirmation via postMessage
  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "WEB3ADS_EXTENSION_READY") {
        window.removeEventListener("message", handler);
        resolve(true);
      }
    };

    window.addEventListener("message", handler);
    window.postMessage({ type: "WEB3ADS_CHECK_EXTENSION" }, "*");

    // Timeout after 500ms
    setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve(false);
    }, 500);
  });
}

/**
 * Extension zkProof data for verified impressions
 */
export interface ExtensionProofData {
  commitment?: string;
  nullifier?: string;
}

/**
 * Request zkProof data from extension (commitment + nullifier)
 */
export async function getExtensionProofData(): Promise<ExtensionProofData> {
  if (!isExtensionInstalled()) {
    return {};
  }

  return new Promise((resolve) => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "WEB3ADS_PROOF_RESPONSE") {
        window.removeEventListener("message", handler);
        resolve({
          commitment: event.data.commitment,
          nullifier: event.data.nullifier,
        });
      }
    };

    window.addEventListener("message", handler);

    // Request proof data from extension
    window.postMessage({ type: "WEB3ADS_GET_PROOF" }, "*");

    // Timeout after 2 seconds
    setTimeout(() => {
      window.removeEventListener("message", handler);
      resolve({});
    }, 2000);
  });
}

/**
 * @deprecated Use getExtensionProofData instead
 */
export async function getViewerCommitment(): Promise<string | undefined> {
  const data = await getExtensionProofData();
  return data.commitment;
}
