import { useState, useEffect, useRef } from "react";
import { useAccount, useSignTypedData, usePublicClient, useSwitchChain } from "wagmi";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Link } from "react-router-dom";
import { parseEther } from "viem";
import { baseSepolia } from "wagmi/chains";

const FORWARDER_ADDRESS = import.meta.env.VITE_FORWARDER_ADDRESS as `0x${string}` | undefined;

type Step = "form" | "watching" | "signing" | "done";

export function Transact() {
  const { address, isConnected, chainId } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const publicClient = usePublicClient();
  const { switchChainAsync } = useSwitchChain();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [gasEstimate, setGasEstimate] = useState(0);
  const [adDuration, setAdDuration] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [txResult, setTxResult] = useState<{ id: string; txHash: string } | null>(null);
  const [error, setError] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const { data: adData } = useQuery({
    queryKey: ["current-ad"],
    queryFn: api.getNextAd,
  });

  // Step 1: Estimate gas for the transfer
  const estimateMutation = useMutation({
    mutationFn: async () => {
      if (!address) throw new Error("Connect your wallet first");
      if (!recipient || !recipient.startsWith("0x") || recipient.length !== 42) {
        throw new Error("Enter a valid wallet address (0x...)");
      }

      // Auto-switch to Base Sepolia if on wrong chain
      if (chainId !== baseSepolia.id) {
        await switchChainAsync({ chainId: baseSepolia.id });
      }

      // Estimate gas for a simple ETH transfer
      return api.estimateGas(address, recipient, "0x");
    },
    onSuccess: (data) => {
      setGasEstimate(data.gasEstimate);
      setAdDuration(data.adDurationSeconds);
      setTimeLeft(data.adDurationSeconds);
      setStep("watching");
      setError("");

      // Start ad countdown
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(intervalRef.current!);
            // Ad complete → award credits in background
            if (address && adData?.ad) {
              api.watchedAd(address, adData.ad.id).catch(() => {});
            }
            setStep("signing");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    },
    onError: (err: Error) => setError(err.message),
  });

  // Step 3: Sign + relay the transfer
  const relayMutation = useMutation({
    mutationFn: async () => {
      if (!address || !FORWARDER_ADDRESS) {
        throw new Error("Contract not configured. Deploy Forwarder first.");
      }

      const nonce = await publicClient!.readContract({
        address: FORWARDER_ADDRESS,
        abi: [{
          inputs: [{ name: "owner", type: "address" }],
          name: "nonces",
          outputs: [{ name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function"
        }],
        functionName: "nonces",
        args: [address],
      }) as bigint;

      const weiValue = amount ? parseEther(amount).toString() : "0";

      const request = {
        from: address,
        to: recipient as `0x${string}`,
        value: weiValue,
        gas: String(gasEstimate + 50000),
        nonce: nonce.toString(),
        data: "0x", // simple ETH transfer, no contract call data
      };

      const domain = {
        name: "Web3AdsForwarder",
        version: "1",
        chainId: 84532,
        verifyingContract: FORWARDER_ADDRESS,
      };

      const types = {
        ForwardRequest: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "value", type: "uint256" },
          { name: "gas", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      };

      const sig = await signTypedDataAsync({
        domain,
        types,
        primaryType: "ForwardRequest",
        message: {
          from: request.from as `0x${string}`,
          to: request.to,
          value: BigInt(request.value),
          gas: BigInt(request.gas),
          nonce: BigInt(request.nonce),
          data: request.data as `0x${string}`,
        },
      });

      return api.relayTx(request, sig);
    },
    onSuccess: (data) => {
      setTxResult({ id: data.id, txHash: data.txHash });
      setStep("done");
      setError("");
    },
    onError: (err: Error) => setError(err.message),
  });

  const resetFlow = () => {
    setStep("form");
    setRecipient("");
    setAmount("");
    setGasEstimate(0);
    setAdDuration(0);
    setTimeLeft(0);
    setTxResult(null);
    setError("");
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  if (!isConnected) {
    return (
      <div className="page centered">
        <div className="connect-prompt">
          <div className="connect-icon">🔒</div>
          <h2>Connect your wallet first</h2>
          <p>You need a wallet to send gasless transactions.</p>
        </div>
      </div>
    );
  }

  const ad = adData?.ad;
  const progress = adDuration > 0 ? ((adDuration - timeLeft) / adDuration) * 100 : 0;

  return (
    <div className="page transact-page">
      <div className="page-header">
        <h1 className="page-title">Send Transaction</h1>
        <p className="page-subtitle">
          {step === "form" && "Transfer to any wallet — we sponsor the gas"}
          {step === "watching" && `Watch a ${adDuration}s ad to cover ${gasEstimate.toLocaleString()} gas`}
          {step === "signing" && "Ad complete — sign your transaction now (0 gas fee)"}
          {step === "done" && "Transaction sent! 🎉"}
        </p>
      </div>

      {/* Step indicator */}
      <div className="step-indicator">
        <div className={`step-dot ${step === "form" ? "active" : "completed"}`}>1</div>
        <div className="step-line" />
        <div className={`step-dot ${step === "watching" ? "active" : (step === "signing" || step === "done") ? "completed" : ""}`}>2</div>
        <div className="step-line" />
        <div className={`step-dot ${step === "signing" ? "active" : step === "done" ? "completed" : ""}`}>3</div>
        <div className="step-line" />
        <div className={`step-dot ${step === "done" ? "active" : ""}`}>4</div>
      </div>
      <div className="step-labels">
        <span>Enter Details</span>
        <span>Watch Ad</span>
        <span>Sign</span>
        <span>Sent</span>
      </div>

      <div className="transact-layout">
        {/* ── Step 1: Enter transfer details ───────────────────── */}
        {step === "form" && (
          <div className="tx-form-card">
            <h2 className="form-title">Send ETH</h2>
            <p className="form-hint">
              Enter the recipient and amount. Instead of paying gas,
              you'll watch a short ad — we cover the rest.
            </p>

            <div className="form-group">
              <label className="form-label">Recipient Address</label>
              <input
                className="form-input"
                type="text"
                placeholder="0x742d35Cc6634C0532925a3b844Bc9..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                disabled={estimateMutation.isPending}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Amount (ETH)</label>
              <input
                className="form-input"
                type="number"
                step="0.0001"
                placeholder="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={estimateMutation.isPending}
              />
            </div>

            {chainId !== baseSepolia.id && (
              <p className="chain-hint" style={{ color: "var(--warning, #f59e0b)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                You're on the wrong network — we'll auto-switch to Base Sepolia.
              </p>
            )}

            <button
              className="btn-primary btn-lg submit-btn"
              onClick={() => estimateMutation.mutate()}
              disabled={estimateMutation.isPending || !recipient.trim()}
            >
              {estimateMutation.isPending ? "⏳ Estimating gas…" : "⚡ Continue — Estimate Gas"}
            </button>
          </div>
        )}

        {/* ── Step 2: Watch Ad ──────────────────────────────────── */}
        {step === "watching" && ad && (
          <div className="ad-container">
            <div className="gas-info-bar">
              <span>💸 Sending: <strong>{amount || "0"} ETH</strong> → <strong>{recipient.slice(0, 8)}…</strong></span>
              <span>⛽ Gas: <strong>{gasEstimate.toLocaleString()}</strong></span>
            </div>

            <div className="ad-card watching">
              <div className="ad-image-wrap">
                <img src={ad.imageUrl} alt={ad.title} className="ad-image" />
                <div className="ad-overlay">
                  <div className="watching-label">📺 Watching ad to cover your gas…</div>
                </div>
              </div>
              <div className="ad-info">
                <h3 className="ad-title">{ad.title}</h3>
                <p className="ad-desc">{ad.description}</p>
              </div>
            </div>

            <div className="progress-wrap">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="timer-label">
                <span className="timer-value">{timeLeft}s</span> remaining — your gas fee is being covered
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Sign ─────────────────────────────────────── */}
        {step === "signing" && (
          <div className="tx-form-card">
            <div style={{ fontSize: "2.5rem", textAlign: "center", marginBottom: "1rem" }}>✅</div>
            <h2 className="form-title" style={{ textAlign: "center" }}>Gas Fee Covered!</h2>
            <p className="form-hint" style={{ textAlign: "center" }}>
              You watched a {adDuration}s ad. Now sign the transaction — <strong>0 gas fee for you</strong>.
            </p>

            <div className="tx-summary">
              <div className="tx-summary-row">
                <span className="tx-summary-label">To</span>
                <span className="tx-summary-value">{recipient.slice(0, 10)}…{recipient.slice(-6)}</span>
              </div>
              <div className="tx-summary-row">
                <span className="tx-summary-label">Amount</span>
                <span className="tx-summary-value">{amount || "0"} ETH</span>
              </div>
              <div className="tx-summary-row">
                <span className="tx-summary-label">Gas Fee</span>
                <span className="tx-summary-value" style={{ color: "#22c55e" }}>FREE (sponsored)</span>
              </div>
            </div>

            <button
              className="btn-primary btn-lg submit-btn"
              onClick={() => relayMutation.mutate()}
              disabled={relayMutation.isPending}
            >
              {relayMutation.isPending ? "⏳ Signing & Broadcasting…" : "✍️ Sign & Send"}
            </button>
          </div>
        )}

        {/* ── Step 4: Done ─────────────────────────────────────── */}
        {step === "done" && txResult && (
          <div className="tx-result-card">
            <div className="result-icon">🚀</div>
            <h3>Transaction Sent!</h3>
            <p className="result-note">
              <strong>{amount || "0"} ETH</strong> sent to <strong>{recipient.slice(0, 8)}…</strong> — you paid <strong>0 gas</strong>.
            </p>
            <div className="tx-hash">
              <span className="tx-hash-label">Tx Hash:</span>
              <a
                href={`https://sepolia.basescan.org/tx/${txResult.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tx-hash-link"
              >
                {txResult.txHash?.slice(0, 16)}…{txResult.txHash?.slice(-8)}
              </a>
            </div>
            <div className="result-actions">
              <button className="btn-primary" onClick={resetFlow}>Send Another</button>
              <Link to="/history" className="btn-secondary">View History</Link>
            </div>
          </div>
        )}

        {error && <p className="error-msg">{error}</p>}
      </div>
    </div>
  );
}
