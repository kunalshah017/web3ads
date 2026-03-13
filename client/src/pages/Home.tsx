import { useAccount, useConnect } from "wagmi";
import { Link } from "react-router-dom";

export function Home() {
  const { isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();

  return (
    <div className="page home-page">
      {/* Hero */}
      <div className="hero-section">
        <div className="hero-badge">Powered by Base Sepolia</div>
        <h1 className="hero-title">
          Make Transactions<br />
          <span className="gradient-text">Without Paying Gas</span>
        </h1>
        <p className="hero-subtitle">
          Want to send crypto? Watch a short ad — we pay your gas fee. That's it.
        </p>

        {!isConnected ? (
          <div className="hero-actions">
            <button
              className="btn-primary btn-lg"
              onClick={() => connect({ connector: connectors[0] })}
              disabled={isPending}
            >
              {isPending ? "Connecting…" : "Connect Wallet to Start"}
            </button>
            <p className="hero-hint">MetaMask or Coinbase Wallet</p>
          </div>
        ) : (
          <div className="hero-actions">
            <Link to="/transact" className="btn-primary btn-lg">
              ⚡ Send a Transaction (Gas-Free)
            </Link>
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="how-it-works">
        <h2 className="section-title">How It Works</h2>
        <div className="steps-grid">
          <div className="step-card">
            <div className="step-num">1</div>
            <div className="step-icon">💸</div>
            <h3>Enter Your Transaction</h3>
            <p>Fill in the recipient address and amount — just like any wallet.</p>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <div className="step-icon">📺</div>
            <h3>Watch a Short Ad</h3>
            <p>We estimate the gas. Higher gas = longer ad. Max 60 seconds.</p>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <div className="step-icon">🚀</div>
            <h3>We Pay the Gas</h3>
            <p>Sign with your wallet. Our relayer broadcasts and pays the gas for you.</p>
          </div>
        </div>
      </div>

      {/* Why section */}
      <div className="how-it-works" style={{ marginTop: "2rem" }}>
        <h2 className="section-title">Why?</h2>
        <div className="tx-form-card">
          <p style={{ color: "var(--text-1)", lineHeight: 1.8, fontSize: "1rem" }}>
            Gas fees are the #1 barrier to crypto adoption. New users don't have ETH, 
            can't figure out faucets, and give up. <strong>Web3Ads</strong> flips the model: 
            advertisers pay for your gas through ad revenue. You watch a short video, we sponsor 
            your transaction. On-chain, verified, no ETH needed.
          </p>
        </div>
      </div>
    </div>
  );
}
