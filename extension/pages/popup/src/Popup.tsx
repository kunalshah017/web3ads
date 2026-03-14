import "@src/Popup.css";
import { withErrorBoundary, withSuspense } from "@extension/shared";
import { ErrorDisplay, LoadingSpinner } from "@extension/ui";
import { useEffect, useState } from "react";

interface ViewerStatus {
  commitment: string;
  isRegistered: boolean;
  walletAddress: string | null;
  totalEarnings: number;
  viewedAdsCount: number;
}

const Popup = () => {
  const [status, setStatus] = useState<ViewerStatus | null>(null);
  const [walletInput, setWalletInput] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch status from background script
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
      if (response) {
        setStatus(response);
        chrome.action.setBadgeText({ text: "" }); // Clear NEW badge
      }
    });
  }, []);

  const handleLinkWallet = async () => {
    if (!walletInput || !walletInput.startsWith("0x")) {
      setError("Please enter a valid wallet address");
      return;
    }

    setIsLinking(true);
    setError(null);

    chrome.runtime.sendMessage(
      { type: "LINK_WALLET", walletAddress: walletInput.toLowerCase() },
      (response) => {
        setIsLinking(false);
        if (response?.success) {
          setStatus((prev) =>
            prev ? { ...prev, walletAddress: walletInput, isRegistered: true } : null,
          );
          setWalletInput("");
        } else {
          setError("Failed to link wallet. Try again.");
        }
      },
    );
  };

  if (!status) {
    return (
      <div className="web3ads-popup loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="web3ads-popup">
      {/* Header */}
      <div className="header">
        <div className="logo">◈ WEB3ADS</div>
        <div className="tagline">EARN FROM ADS YOU VIEW</div>
      </div>

      {/* Status Card */}
      <div className="status-card">
        <div className="status-row">
          <span className="label">STATUS</span>
          <span className={`value ${status.isRegistered ? "active" : "pending"}`}>
            {status.isRegistered ? "● ACTIVE" : "○ UNLINKED"}
          </span>
        </div>

        <div className="status-row">
          <span className="label">ADS VIEWED</span>
          <span className="value">{status.viewedAdsCount}</span>
        </div>

        <div className="status-row earnings">
          <span className="label">TOTAL EARNED</span>
          <span className="value highlight">${status.totalEarnings.toFixed(2)}</span>
        </div>
      </div>

      {/* Wallet Section */}
      <div className="wallet-section">
        {status.walletAddress ? (
          <div className="wallet-linked">
            <span className="label">LINKED WALLET</span>
            <span className="address">{`${status.walletAddress.slice(0, 6)}...${status.walletAddress.slice(-4)}`}</span>
          </div>
        ) : (
          <div className="wallet-link-form">
            <input
              type="text"
              placeholder="0x..."
              value={walletInput}
              onChange={(e) => setWalletInput(e.target.value)}
              className="wallet-input"
            />
            <button onClick={handleLinkWallet} disabled={isLinking} className="link-btn">
              {isLinking ? "LINKING..." : "LINK WALLET"}
            </button>
            {error && <div className="error">{error}</div>}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="info-section">
        <div className="info-item">
          <span className="icon">💰</span>
          <span>Earn 20% of ad revenue</span>
        </div>
        <div className="info-item">
          <span className="icon">🔒</span>
          <span>Privacy via zkProofs</span>
        </div>
        <div className="info-item">
          <span className="icon">⛓️</span>
          <span>Withdraw to Base L2</span>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <span className="commitment">
          ID: {status.commitment.slice(0, 8)}...{status.commitment.slice(-4)}
        </span>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
