/**
 * Web3Ads Content Script
 *
 * Runs on all pages to:
 * 1. Signal extension presence via data attribute + postMessage
 * 2. Listen for proof requests from Web3Ad SDK
 * 3. Relay proof data from background script
 */

// Signal extension presence (CSP-safe - no inline script)
function signalExtensionPresence() {
  // Set data attribute on document element (content scripts can do this)
  document.documentElement.setAttribute('data-web3ads-extension', 'true');

  // Also post a message for scripts that are listening
  window.postMessage({ type: 'WEB3ADS_EXTENSION_READY' }, '*');
}

// Listen for messages from the page (Web3Ad SDK)
function setupMessageListener() {
  window.addEventListener('message', async event => {
    // Only accept messages from the same frame
    if (event.source !== window) return;

    // Handle extension check request
    if (event.data?.type === 'WEB3ADS_CHECK_EXTENSION') {
      window.postMessage({ type: 'WEB3ADS_EXTENSION_READY' }, '*');
      return;
    }

    // Handle proof request from SDK
    if (event.data?.type === 'WEB3ADS_GET_PROOF') {
      try {
        // Request proof data from background script
        const response = await chrome.runtime.sendMessage({
          type: 'GET_PROOF_DATA',
          adId: event.data.adId || 'unknown',
        });

        // Send response back to page
        window.postMessage(
          {
            type: 'WEB3ADS_PROOF_RESPONSE',
            commitment: response.commitment,
            nullifier: response.nullifier,
          },
          '*',
        );
      } catch (error) {
        console.error('[Web3Ads] Error getting proof:', error);
        window.postMessage(
          {
            type: 'WEB3ADS_PROOF_RESPONSE',
            commitment: undefined,
            nullifier: undefined,
          },
          '*',
        );
      }
    }

    // Legacy support for commitment-only requests
    if (event.data?.type === 'WEB3ADS_GET_COMMITMENT') {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_PROOF_DATA',
          adId: 'legacy',
        });

        window.postMessage(
          {
            type: 'WEB3ADS_COMMITMENT_RESPONSE',
            commitment: response.commitment,
          },
          '*',
        );
      } catch (error) {
        window.postMessage(
          {
            type: 'WEB3ADS_COMMITMENT_RESPONSE',
            commitment: undefined,
          },
          '*',
        );
      }
    }

    // Handle wallet linking from web3ads.wtf website
    if (event.data?.type === 'WEB3ADS_LINK_WALLET') {
      // Only allow from our domain
      if (!window.location.hostname.includes('web3ads.wtf') && !window.location.hostname.includes('localhost')) {
        console.warn('[Web3Ads] Wallet linking only allowed from web3ads.wtf');
        return;
      }

      try {
        // Pass identity data from client app to background script
        const response = await chrome.runtime.sendMessage({
          type: 'LINK_WALLET',
          walletAddress: event.data.walletAddress,
          commitment: event.data.commitment, // Semaphore commitment from client
          secret: event.data.secret, // Semaphore secret (exported identity) from client
        });

        window.postMessage(
          {
            type: 'WEB3ADS_WALLET_LINKED',
            success: response.success,
            commitment: response.commitment,
            error: response.error,
          },
          '*',
        );
      } catch (error) {
        console.error('[Web3Ads] Error linking wallet:', error);
        window.postMessage(
          {
            type: 'WEB3ADS_WALLET_LINKED',
            success: false,
            error: String(error),
          },
          '*',
        );
      }
    }

    // Handle status request from website
    if (event.data?.type === 'WEB3ADS_GET_STATUS') {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_STATUS',
        });

        window.postMessage(
          {
            type: 'WEB3ADS_STATUS_RESPONSE',
            ...response,
          },
          '*',
        );
      } catch (error) {
        window.postMessage(
          {
            type: 'WEB3ADS_STATUS_RESPONSE',
            error: 'Extension not available',
          },
          '*',
        );
      }
    }
  });
}

// Initialize
console.log('[Web3Ads] Content script loaded');
signalExtensionPresence();
setupMessageListener();
