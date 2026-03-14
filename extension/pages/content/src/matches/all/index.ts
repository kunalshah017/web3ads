/**
 * Web3Ads Content Script
 *
 * Runs on all pages to:
 * 1. Inject the __WEB3ADS_EXTENSION__ flag
 * 2. Listen for proof requests from Web3Ad SDK
 * 3. Relay proof data from background script
 */

// Inject the extension detection flag into the page
function injectExtensionFlag() {
  const script = document.createElement("script");
  script.textContent = `window.__WEB3ADS_EXTENSION__ = true;`;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
}

// Listen for messages from the page (Web3Ad SDK)
function setupMessageListener() {
  window.addEventListener("message", async (event) => {
    // Only accept messages from the same frame
    if (event.source !== window) return;

    // Handle proof request from SDK
    if (event.data?.type === "WEB3ADS_GET_PROOF") {
      try {
        // Request proof data from background script
        const response = await chrome.runtime.sendMessage({
          type: "GET_PROOF_DATA",
          adId: event.data.adId || "unknown",
        });

        // Send response back to page
        window.postMessage(
          {
            type: "WEB3ADS_PROOF_RESPONSE",
            commitment: response.commitment,
            nullifier: response.nullifier,
          },
          "*",
        );
      } catch (error) {
        console.error("[Web3Ads] Error getting proof:", error);
        window.postMessage(
          {
            type: "WEB3ADS_PROOF_RESPONSE",
            commitment: undefined,
            nullifier: undefined,
          },
          "*",
        );
      }
    }

    // Legacy support for commitment-only requests
    if (event.data?.type === "WEB3ADS_GET_COMMITMENT") {
      try {
        const response = await chrome.runtime.sendMessage({
          type: "GET_PROOF_DATA",
          adId: "legacy",
        });

        window.postMessage(
          {
            type: "WEB3ADS_COMMITMENT_RESPONSE",
            commitment: response.commitment,
          },
          "*",
        );
      } catch (error) {
        window.postMessage(
          {
            type: "WEB3ADS_COMMITMENT_RESPONSE",
            commitment: undefined,
          },
          "*",
        );
      }
    }
  });
}

// Initialize
console.log("[Web3Ads] Content script loaded");
injectExtensionFlag();
setupMessageListener();
