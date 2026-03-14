import "webextension-polyfill";
import { Identity } from "@semaphore-protocol/core";

/**
 * Web3Ads Background Service Worker
 *
 * Manages Semaphore identity for privacy-preserving ad tracking.
 * Viewers earn 20% of ad revenue through zkProof verification.
 */

// Storage keys
const STORAGE_KEYS = {
  IDENTITY_SECRET: "web3ads_identity_secret",
  WALLET_ADDRESS: "web3ads_wallet_address",
  IS_REGISTERED: "web3ads_is_registered",
  TOTAL_EARNINGS: "web3ads_total_earnings",
  VIEWED_ADS: "web3ads_viewed_ads",
};

// API URL
const API_URL = process.env.WEB3ADS_API_URL || "http://localhost:3001";

/**
 * Initialize or restore Semaphore identity
 */
async function getOrCreateIdentity(): Promise<Identity> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.IDENTITY_SECRET);

  if (result[STORAGE_KEYS.IDENTITY_SECRET]) {
    // Restore existing identity from secret
    return new Identity(result[STORAGE_KEYS.IDENTITY_SECRET]);
  }

  // Create new identity
  const identity = new Identity();

  // Store the secret for persistence
  await chrome.storage.local.set({
    [STORAGE_KEYS.IDENTITY_SECRET]: identity.export(),
  });

  return identity;
}

/**
 * Get current identity commitment
 */
async function getCommitment(): Promise<string> {
  const identity = await getOrCreateIdentity();
  return identity.commitment.toString();
}

/**
 * Generate nullifier for a specific ad view (prevents double-counting)
 */
async function generateNullifier(adId: string): Promise<string> {
  const identity = await getOrCreateIdentity();
  // Use the ad ID as a scope/external nullifier
  // This creates a unique, deterministic nullifier per ad per identity
  const encoder = new TextEncoder();
  const data = encoder.encode(adId + identity.commitment.toString());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Register viewer with the server
 */
async function registerViewer(walletAddress?: string): Promise<boolean> {
  try {
    const commitment = await getCommitment();

    const response = await fetch(`${API_URL}/api/viewers/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        semaphoreCommitment: commitment,
        walletAddress,
      }),
    });

    if (response.ok) {
      await chrome.storage.local.set({
        [STORAGE_KEYS.IS_REGISTERED]: true,
        [STORAGE_KEYS.WALLET_ADDRESS]: walletAddress || null,
      });
      return true;
    }

    return false;
  } catch (error) {
    console.error("[Web3Ads] Registration failed:", error);
    return false;
  }
}

/**
 * Track viewed ad (for local history)
 */
async function trackViewedAd(adId: string): Promise<void> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.VIEWED_ADS);
  const viewedAds = result[STORAGE_KEYS.VIEWED_ADS] || [];

  viewedAds.push({
    adId,
    timestamp: Date.now(),
  });

  // Keep only last 1000 ads
  if (viewedAds.length > 1000) {
    viewedAds.shift();
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.VIEWED_ADS]: viewedAds,
  });
}

// Message handler for content script and popup communication
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  (async () => {
    switch (message.type) {
      case "GET_PROOF_DATA": {
        // Content script requesting proof data for impression
        const commitment = await getCommitment();
        const nullifier = await generateNullifier(message.adId);
        await trackViewedAd(message.adId);

        sendResponse({
          commitment,
          nullifier,
        });
        break;
      }

      case "GET_STATUS": {
        // Popup requesting current status
        const identity = await getOrCreateIdentity();
        const storage = await chrome.storage.local.get([
          STORAGE_KEYS.IS_REGISTERED,
          STORAGE_KEYS.WALLET_ADDRESS,
          STORAGE_KEYS.TOTAL_EARNINGS,
          STORAGE_KEYS.VIEWED_ADS,
        ]);

        sendResponse({
          commitment: identity.commitment.toString(),
          isRegistered: storage[STORAGE_KEYS.IS_REGISTERED] || false,
          walletAddress: storage[STORAGE_KEYS.WALLET_ADDRESS] || null,
          totalEarnings: storage[STORAGE_KEYS.TOTAL_EARNINGS] || 0,
          viewedAdsCount: (storage[STORAGE_KEYS.VIEWED_ADS] || []).length,
        });
        break;
      }

      case "REGISTER": {
        // User registering from popup
        const success = await registerViewer(message.walletAddress);
        sendResponse({ success });
        break;
      }

      case "LINK_WALLET": {
        // Linking wallet to existing identity
        const success = await registerViewer(message.walletAddress);
        sendResponse({ success });
        break;
      }

      default:
        sendResponse({ error: "Unknown message type" });
    }
  })();

  // Return true to indicate we will send response asynchronously
  return true;
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log("[Web3Ads] Extension installed");

  // Create identity immediately
  const identity = await getOrCreateIdentity();
  console.log("[Web3Ads] Identity commitment:", identity.commitment.toString());

  // Set extension badge
  chrome.action.setBadgeBackgroundColor({ color: "#ff3e00" });
  chrome.action.setBadgeText({ text: "NEW" });
});

console.log("[Web3Ads] Background service worker loaded");
