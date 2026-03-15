import 'webextension-polyfill';

/**
 * Web3Ads Background Service Worker
 *
 * Lightweight identity storage and ad tracking.
 * Semaphore identity is generated on the client app (web3ads.wtf/viewer)
 * and sent here for storage. This avoids service worker WASM limitations.
 *
 * Viewers earn 20% of ad revenue through zkProof verification.
 */

// Storage keys
const STORAGE_KEYS = {
  IDENTITY_COMMITMENT: 'web3ads_identity_commitment',
  IDENTITY_SECRET: 'web3ads_identity_secret', // Exported secret from Semaphore Identity
  WALLET_ADDRESS: 'web3ads_wallet_address',
  IS_REGISTERED: 'web3ads_is_registered',
  TOTAL_EARNINGS: 'web3ads_total_earnings',
  VIEWED_ADS: 'web3ads_viewed_ads',
};

// API URL - hardcoded to production (process.env gets stripped by extension bundler)
const API_URL = 'https://api.web3ads.wtf';

/**
 * Helper to convert ArrayBuffer to hex string
 */
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Check if identity exists (set from client app)
 */
async function hasIdentity(): Promise<boolean> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.IDENTITY_COMMITMENT);
  return !!result[STORAGE_KEYS.IDENTITY_COMMITMENT];
}

/**
 * Get stored commitment (must be set from client app first)
 */
async function getCommitment(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.IDENTITY_COMMITMENT);
  return result[STORAGE_KEYS.IDENTITY_COMMITMENT] || null;
}

/**
 * Store identity from client app
 */
async function storeIdentity(commitment: string, secret: string): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.IDENTITY_COMMITMENT]: commitment,
    [STORAGE_KEYS.IDENTITY_SECRET]: secret,
  });
}

/**
 * Generate nullifier for a specific ad view (prevents double-counting)
 * Uses stored secret + adId to create unique nullifier
 */
async function generateNullifier(adId: string): Promise<string | null> {
  const result = await chrome.storage.local.get([STORAGE_KEYS.IDENTITY_COMMITMENT, STORAGE_KEYS.IDENTITY_SECRET]);

  if (!result[STORAGE_KEYS.IDENTITY_COMMITMENT]) {
    return null;
  }

  // Use secret + adId for nullifier (deterministic per ad per identity)
  const encoder = new TextEncoder();
  const data = encoder.encode(
    adId + (result[STORAGE_KEYS.IDENTITY_SECRET] || result[STORAGE_KEYS.IDENTITY_COMMITMENT]),
  );
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

/**
 * Register viewer with the server
 */
async function registerViewer(walletAddress?: string): Promise<boolean> {
  try {
    const commitment = await getCommitment();

    const response = await fetch(`${API_URL}/api/viewers/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    console.error('[Web3Ads] Registration failed:', error);
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
      case 'GET_PROOF_DATA': {
        // Content script requesting proof data for impression
        const commitment = await getCommitment();
        if (!commitment) {
          sendResponse({ error: 'No identity set. Please link wallet on web3ads.wtf/viewer' });
          break;
        }
        const nullifier = await generateNullifier(message.adId);
        await trackViewedAd(message.adId);

        sendResponse({
          commitment,
          nullifier,
        });
        break;
      }

      case 'GET_STATUS': {
        // Popup requesting current status
        const commitment = await getCommitment();
        const storage = await chrome.storage.local.get([
          STORAGE_KEYS.IS_REGISTERED,
          STORAGE_KEYS.WALLET_ADDRESS,
          STORAGE_KEYS.TOTAL_EARNINGS,
          STORAGE_KEYS.VIEWED_ADS,
        ]);

        sendResponse({
          hasIdentity: !!commitment,
          commitment: commitment || null,
          isRegistered: storage[STORAGE_KEYS.IS_REGISTERED] || false,
          walletAddress: storage[STORAGE_KEYS.WALLET_ADDRESS] || null,
          totalEarnings: storage[STORAGE_KEYS.TOTAL_EARNINGS] || 0,
          viewedAdsCount: (storage[STORAGE_KEYS.VIEWED_ADS] || []).length,
        });
        break;
      }

      case 'STORE_IDENTITY': {
        // Client app sending Semaphore identity to store
        // This is called from web3ads.wtf/viewer via content script
        if (message.commitment && message.secret) {
          await storeIdentity(message.commitment, message.secret);
          sendResponse({ success: true });
        } else {
          sendResponse({ error: 'Missing commitment or secret' });
        }
        break;
      }

      case 'LINK_WALLET': {
        // Linking wallet (from client app via content script)
        if (message.commitment && message.secret) {
          // Store identity first
          await storeIdentity(message.commitment, message.secret);
        }
        // Then register with server
        const success = await registerViewer(message.walletAddress);
        const commitment = await getCommitment();
        sendResponse({ success, commitment });
        break;
      }

      case 'CLEAR_IDENTITY': {
        // Clear all identity data (for switching wallets)
        await chrome.storage.local.remove([
          STORAGE_KEYS.IDENTITY_COMMITMENT,
          STORAGE_KEYS.IDENTITY_SECRET,
          STORAGE_KEYS.WALLET_ADDRESS,
          STORAGE_KEYS.IS_REGISTERED,
          STORAGE_KEYS.TOTAL_EARNINGS,
          STORAGE_KEYS.VIEWED_ADS,
        ]);
        sendResponse({ success: true });
        break;
      }

      default:
        sendResponse({ error: 'Unknown message type' });
    }
  })();

  // Return true to indicate we will send response asynchronously
  return true;
});

// Initialize on install
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Web3Ads] Extension installed');
  console.log('[Web3Ads] Visit web3ads.wtf/viewer to link your wallet and start earning');

  // Set extension badge to prompt user
  chrome.action.setBadgeBackgroundColor({ color: '#ff3e00' });
  chrome.action.setBadgeText({ text: 'NEW' });
});

console.log('[Web3Ads] Background service worker loaded');
