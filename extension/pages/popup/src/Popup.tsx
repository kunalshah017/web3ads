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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Fetch status from background script
    chrome.runtime.sendMessage({ type: "GET_STATUS" }, (response) => {
      if (response) {
        setStatus(response);
        chrome.action.setBadgeText({ text: "" }); // Clear NEW badge
      }
    });
  }, []);

  const handleLinkWallet = () => {
    // Open the viewer page on our website to link wallet
    chrome.tabs.create({ url: "https://web3ads.wtf/viewer" });
  };

  const copyCommitment = async () => {
    if (!status) return;
    await navigator.clipboard.writeText(status.commitment);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <div className="wallet-link-cta">
            <p className="link-info">Connect your wallet on our website to start earning rewards</p>
            <button onClick={handleLinkWallet} className="link-btn">
              LINK WALLET ON WEBSITE →
            </button>
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
        <button className="commitment-btn" onClick={copyCommitment}>
          {copied ? "COPIED!" : `ID: ${status.commitment.slice(0, 8)}...${status.commitment.slice(-4)}`}
        </button>
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
