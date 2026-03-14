import { useAccount } from "wagmi";
import { WalletButton } from "../components/WalletButton";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Identity } from "@semaphore-protocol/core";
import { useViewerBalance, useViewerWithdraw } from "../hooks/useContracts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const IDENTITY_STORAGE_KEY = "web3ads_semaphore_identity";
const MIN_WITHDRAWAL = 10_000_000n; // 10 USDC

interface ExtensionStatus {
    hasIdentity?: boolean;
    commitment?: string | null;
    isRegistered?: boolean;
    walletAddress?: string | null;
    totalEarnings?: number;
    viewedAdsCount?: number;
    error?: string;
}

/**
 * Get or create Semaphore identity (stored in localStorage)
 */
function getOrCreateIdentity(): Identity {
    const stored = localStorage.getItem(IDENTITY_STORAGE_KEY);
    if (stored) {
        try {
            return new Identity(stored);
        } catch {
            // Invalid stored identity, create new
        }
    }

    const identity = new Identity();
    localStorage.setItem(IDENTITY_STORAGE_KEY, identity.export());
    return identity;
}

export function ViewerPage() {
    const { address, isConnected } = useAccount();
    const [searchParams, setSearchParams] = useSearchParams();
    const [extensionInstalled, setExtensionInstalled] = useState(false);
    const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus | null>(null);
    const [isLinking, setIsLinking] = useState(false);
    const [linkingError, setLinkingError] = useState<string | null>(null);
    const [identity, setIdentity] = useState<Identity | null>(null);
    const [isRequestingProof, setIsRequestingProof] = useState(false);
    const [withdrawError, setWithdrawError] = useState<string | null>(null);

    // Get commitment for balance check
    const commitment = identity?.commitment.toString();
    const { balance: onChainBalance, formattedBalance, refetch: refetchBalance } = useViewerBalance(commitment);
    const { withdraw, isPending: isWithdrawing, isConfirming, isSuccess: withdrawSuccess } = useViewerWithdraw();

    // Check if in switch-wallet mode (coming from extension popup)
    const isSwitchWalletMode = searchParams.get("action") === "switch-wallet";

    const canWithdraw = onChainBalance && onChainBalance >= MIN_WITHDRAWAL;

    // Refetch balance on successful withdrawal
    useEffect(() => {
        if (withdrawSuccess) {
            refetchBalance();
        }
    }, [withdrawSuccess, refetchBalance]);

    // Initialize Semaphore identity on mount (or create fresh one if switching)
    useEffect(() => {
        if (isSwitchWalletMode) {
            // Clear old identity when switching wallets
            localStorage.removeItem(IDENTITY_STORAGE_KEY);
        }
        const id = getOrCreateIdentity();
        setIdentity(id);
        console.log("[Web3Ads] Semaphore commitment:", id.commitment.toString());
    }, [isSwitchWalletMode]);

    // Check if extension is installed
    useEffect(() => {
        const checkExtension = () => {
            // Extension sets data attribute on document element (CSP-safe)
            const hasAttribute = document.documentElement.hasAttribute("data-web3ads-extension");
            setExtensionInstalled(hasAttribute);
        };

        // Listen for extension ready message
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "WEB3ADS_EXTENSION_READY") {
                setExtensionInstalled(true);
            }
        };

        window.addEventListener("message", handleMessage);

        // Check immediately and after a delay
        checkExtension();
        const timeout = setTimeout(checkExtension, 500);

        // Also request extension confirmation
        window.postMessage({ type: "WEB3ADS_CHECK_EXTENSION" }, "*");

        return () => {
            clearTimeout(timeout);
            window.removeEventListener("message", handleMessage);
        };
    }, []);

    // Get extension status
    useEffect(() => {
        if (!extensionInstalled) return;

        const handleStatusResponse = (event: MessageEvent) => {
            if (event.data?.type === "WEB3ADS_STATUS_RESPONSE") {
                setExtensionStatus(event.data);
            }
        };

        window.addEventListener("message", handleStatusResponse);
        window.postMessage({ type: "WEB3ADS_GET_STATUS" }, "*");

        return () => window.removeEventListener("message", handleStatusResponse);
    }, [extensionInstalled]);

    // Link wallet to extension (sends Semaphore identity + wallet address)
    const linkWallet = useCallback(async () => {
        if (!address || !extensionInstalled || !identity) return;

        setIsLinking(true);
        setLinkingError(null);

        const commitment = identity.commitment.toString();
        const secret = identity.export();

        const handleLinkResponse = (event: MessageEvent) => {
            if (event.data?.type === "WEB3ADS_WALLET_LINKED") {
                if (event.data.success) {
                    setExtensionStatus((prev) => ({
                        ...prev,
                        hasIdentity: true,
                        walletAddress: address,
                        isRegistered: true,
                        commitment: commitment,
                    }));
                    setIsLinking(false);
                } else {
                    setLinkingError(event.data.error || "Failed to link wallet. Please try again.");
                    setIsLinking(false);
                }
                window.removeEventListener("message", handleLinkResponse);
            }
        };

        window.addEventListener("message", handleLinkResponse);

        // Send identity + wallet to extension via content script
        window.postMessage({
            type: "WEB3ADS_LINK_WALLET",
            walletAddress: address.toLowerCase(),
            commitment: commitment,
            secret: secret,
        }, "*");

        // Also register with server
        try {
            await fetch(`${API_URL}/api/viewers/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    semaphoreCommitment: commitment,
                    walletAddress: address.toLowerCase(),
                }),
            });
        } catch (error) {
            console.error("[Web3Ads] Server registration failed:", error);
            // Don't fail the whole flow - extension registration is more important
        }

        // Timeout after 10 seconds
        setTimeout(() => {
            setIsLinking(false);
            window.removeEventListener("message", handleLinkResponse);
        }, 10000);
    }, [address, extensionInstalled, identity]);

    // Handle withdrawal - get proof from backend, then call contract
    const handleWithdraw = useCallback(async () => {
        if (!address || !commitment) return;

        setIsRequestingProof(true);
        setWithdrawError(null);

        try {
            // Request withdrawal proof from backend
            const response = await fetch(`${API_URL}/api/viewers/withdrawal-proof`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    commitment,
                    recipient: address,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                setWithdrawError(error.error || "Failed to get withdrawal proof");
                setIsRequestingProof(false);
                return;
            }

            const { signature } = await response.json();
            setIsRequestingProof(false);

            // Call contract with signature
            withdraw(commitment, signature);
        } catch (error) {
            console.error("[Web3Ads] Withdrawal failed:", error);
            setWithdrawError("Failed to process withdrawal");
            setIsRequestingProof(false);
        }
    }, [address, commitment, withdraw]);

    const isWalletLinked = extensionStatus?.walletAddress?.toLowerCase() === address?.toLowerCase();

    return (
        <div className="px-6 py-12">
            <div className="mx-auto max-w-4xl">
                {/* Hero */}
                <div className="border-4 border-white bg-black p-12 text-center">
                    <h1 className="font-mono text-4xl font-black uppercase md:text-5xl">
                        EARN BY VIEWING ADS
                    </h1>
                    <p className="mt-4 font-mono text-sm uppercase tracking-wider text-zinc-400">
                        INSTALL OUR EXTENSION. GET 20% OF AD REVENUE.
                    </p>
                </div>

                {/* Identity Status */}
                {identity && (
                    <div className="mt-4 border-2 border-zinc-700 bg-zinc-900 p-4">
                        <div className="flex items-center justify-between">
                            <span className="font-mono text-xs uppercase text-zinc-500">SEMAPHORE ID</span>
                            <span className="font-mono text-xs text-zinc-300">
                                {identity.commitment.toString().slice(0, 16)}...{identity.commitment.toString().slice(-8)}
                            </span>
                        </div>
                    </div>
                )}

                {/* Status Section - Show based on extension/wallet state */}
                {extensionInstalled ? (
                    <div className="mt-8 border-4 border-accent bg-zinc-900 p-8">
                        <div className="flex items-center justify-between border-b-2 border-zinc-700 pb-4">
                            <span className="font-mono text-xs uppercase text-zinc-500">EXTENSION STATUS</span>
                            <span className="font-mono text-sm font-bold uppercase text-green-500">● INSTALLED</span>
                        </div>

                        {extensionStatus && (
                            <div className="mt-6 grid gap-4 md:grid-cols-3">
                                <div className="border-2 border-zinc-700 bg-black p-4">
                                    <span className="font-mono text-xs uppercase text-zinc-500">ADS VIEWED</span>
                                    <span className="mt-2 block font-mono text-3xl font-black text-white">
                                        {extensionStatus.viewedAdsCount || 0}
                                    </span>
                                </div>
                                <div className="border-2 border-zinc-700 bg-black p-4">
                                    <span className="font-mono text-xs uppercase text-zinc-500">TOTAL EARNED</span>
                                    <span className="mt-2 block font-mono text-3xl font-black text-accent">
                                        ${(extensionStatus.totalEarnings || 0).toFixed(2)}
                                    </span>
                                </div>
                                <div className="border-2 border-zinc-700 bg-black p-4">
                                    <span className="font-mono text-xs uppercase text-zinc-500">WALLET</span>
                                    <span className="mt-2 block font-mono text-lg font-bold text-white">
                                        {extensionStatus.walletAddress
                                            ? `${extensionStatus.walletAddress.slice(0, 6)}...${extensionStatus.walletAddress.slice(-4)}`
                                            : "NOT LINKED"}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Wallet Linking Section */}
                        <div className="mt-6 border-t-2 border-zinc-700 pt-6">
                            {/* Switch Wallet Mode - user came from extension popup */}
                            {isSwitchWalletMode ? (
                                <div className="text-center">
                                    <div className="mb-4 border-2 border-yellow-500 bg-yellow-500/10 p-4">
                                        <span className="font-mono text-sm font-bold uppercase text-yellow-500">
                                            🔄 SWITCH WALLET MODE
                                        </span>
                                        <p className="mt-2 font-mono text-xs uppercase text-zinc-400">
                                            CONNECT A NEW WALLET TO START EARNING WITH IT
                                        </p>
                                    </div>

                                    {!isConnected ? (
                                        <div>
                                            <p className="font-mono text-sm uppercase text-zinc-400">
                                                CONNECT THE WALLET YOU WANT TO USE
                                            </p>
                                            <div className="mt-4">
                                                <WalletButton />
                                            </div>
                                        </div>
                                    ) : isWalletLinked ? (
                                        <div>
                                            <span className="inline-block border-2 border-green-500 bg-green-500/10 px-4 py-2 font-mono text-sm font-bold uppercase text-green-500">
                                                ✓ WALLET LINKED SUCCESSFULLY
                                            </span>
                                            <p className="mt-4 font-mono text-xs uppercase text-zinc-500">
                                                YOUR AD VIEW EARNINGS WILL BE CREDITED TO THIS WALLET
                                            </p>
                                            <button
                                                onClick={() => setSearchParams({})}
                                                className="mt-4 border-2 border-zinc-600 bg-zinc-800 px-6 py-2 font-mono text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:bg-zinc-700"
                                            >
                                                DONE
                                            </button>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="font-mono text-sm uppercase text-zinc-400">
                                                LINK THIS WALLET: {address?.slice(0, 6)}...{address?.slice(-4)}
                                            </p>
                                            <button
                                                onClick={linkWallet}
                                                disabled={isLinking}
                                                className="mt-4 border-4 border-yellow-500 bg-yellow-500 px-8 py-4 font-mono text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {isLinking ? "LINKING WALLET..." : "LINK WALLET"}
                                            </button>
                                            {linkingError && (
                                                <p className="mt-4 font-mono text-xs uppercase text-red-500">{linkingError}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : !isConnected ? (
                                <div className="text-center">
                                    <p className="font-mono text-sm uppercase text-zinc-400">
                                        CONNECT YOUR WALLET TO LINK IT WITH THE EXTENSION
                                    </p>
                                    <div className="mt-4">
                                        <WalletButton />
                                    </div>
                                </div>
                            ) : isWalletLinked ? (
                                <div className="text-center">
                                    <span className="inline-block border-2 border-green-500 bg-green-500/10 px-4 py-2 font-mono text-sm font-bold uppercase text-green-500">
                                        ✓ WALLET LINKED SUCCESSFULLY
                                    </span>
                                    <p className="mt-4 font-mono text-xs uppercase text-zinc-500">
                                        YOUR AD VIEW EARNINGS WILL BE CREDITED TO THIS WALLET
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <p className="font-mono text-sm uppercase text-zinc-400">
                                        LINK YOUR WALLET TO START RECEIVING USDC REWARDS
                                    </p>
                                    <button
                                        onClick={linkWallet}
                                        disabled={isLinking}
                                        className="mt-4 border-4 border-accent bg-accent px-8 py-4 font-mono text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {isLinking ? "LINKING WALLET..." : `LINK ${address?.slice(0, 6)}...${address?.slice(-4)}`}
                                    </button>
                                    {linkingError && (
                                        <p className="mt-4 font-mono text-xs uppercase text-red-500">{linkingError}</p>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Withdrawal Section - Show when wallet is linked */}
                        {isWalletLinked && isConnected && (
                            <div className="mt-6 border-t-2 border-zinc-700 pt-6">
                                <h3 className="font-mono text-xs font-bold uppercase text-zinc-500">ON-CHAIN BALANCE</h3>
                                <div className="mt-4 grid gap-4 md:grid-cols-2">
                                    <div className="border-2 border-zinc-700 bg-black p-4">
                                        <span className="font-mono text-xs uppercase text-zinc-500">AVAILABLE TO WITHDRAW</span>
                                        <span className="mt-2 block font-mono text-3xl font-black text-accent">
                                            ${formattedBalance}
                                        </span>
                                        <span className="font-mono text-xs text-zinc-600">USDC on Base Sepolia</span>
                                    </div>
                                    <div className="flex flex-col justify-center border-2 border-zinc-700 bg-black p-4">
                                        <button
                                            onClick={handleWithdraw}
                                            disabled={!canWithdraw || isWithdrawing || isConfirming || isRequestingProof}
                                            className={`w-full border-4 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                                                canWithdraw
                                                    ? "border-accent bg-accent text-black hover:bg-white"
                                                    : "border-zinc-700 bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                            }`}
                                        >
                                            {isRequestingProof
                                                ? "REQUESTING PROOF..."
                                                : isWithdrawing || isConfirming
                                                    ? "WITHDRAWING..."
                                                    : `WITHDRAW${!canWithdraw ? " (MIN $10)" : ""}`}
                                        </button>
                                        {withdrawSuccess && (
                                            <p className="mt-2 text-center font-mono text-xs uppercase text-green-500">
                                                ✓ WITHDRAWAL SUCCESSFUL
                                            </p>
                                        )}
                                        {withdrawError && (
                                            <p className="mt-2 text-center font-mono text-xs uppercase text-red-500">
                                                {withdrawError}
                                            </p>
                                        )}
                                        <p className="mt-2 text-center font-mono text-xs uppercase text-zinc-600">
                                            MIN: $10 USDC
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Extension Not Installed */
                    <div className="mt-8 border-4 border-accent bg-zinc-900 p-8">
                        <div className="text-center">
                            <div className="text-6xl">🧩</div>
                            <h2 className="mt-4 font-mono text-2xl font-black uppercase">WEB3ADS EXTENSION</h2>
                            <p className="mx-auto mt-4 max-w-lg font-mono text-xs uppercase leading-relaxed text-zinc-400">
                                OUR BROWSER EXTENSION USES ZERO-KNOWLEDGE PROOFS TO VERIFY YOUR AD VIEWS WITHOUT
                                TRACKING YOUR IDENTITY.
                            </p>
                        </div>

                        <div className="mt-8 grid grid-cols-3 gap-4">
                            {[
                                { icon: "🔒", label: "PRIVACY-FIRST" },
                                { icon: "⚡", label: "AUTOMATIC" },
                                { icon: "💰", label: "EARN USDC" },
                            ].map((feature) => (
                                <div key={feature.label} className="border-2 border-zinc-700 bg-black p-4 text-center">
                                    <span className="text-2xl">{feature.icon}</span>
                                    <span className="mt-2 block font-mono text-xs font-bold uppercase">{feature.label}</span>
                                </div>
                            ))}
                        </div>

                        <a
                            href="https://chrome.google.com/webstore"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-8 block w-full border-4 border-white bg-white py-4 text-center font-mono text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-accent hover:text-white"
                        >
                            INSTALL EXTENSION
                        </a>
                        <p className="mt-4 text-center font-mono text-xs uppercase text-zinc-600">
                            CHROME • FIREFOX • BRAVE
                        </p>
                    </div>
                )}

                {/* How It Works */}
                <div className="mt-12">
                    <h2 className="border-b-4 border-zinc-800 pb-4 font-mono text-2xl font-black uppercase">
                        HOW IT WORKS
                    </h2>
                    <div className="mt-8 space-y-6">
                        {[
                            {
                                num: "1",
                                title: "INSTALL EXTENSION",
                                desc: "One-click install. The extension generates a private zkProof identity that's stored only on your device.",
                            },
                            {
                                num: "2",
                                title: "LINK YOUR WALLET",
                                desc: "Connect your wallet here to link it with your extension identity. This lets you receive USDC rewards.",
                            },
                            {
                                num: "3",
                                title: "BROWSE NORMALLY",
                                desc: "Visit any site with Web3Ads. The extension automatically detects and verifies your ad views.",
                            },
                            {
                                num: "4",
                                title: "WITHDRAW TO BASE",
                                desc: "Once you reach $10, withdraw your USDC rewards directly to your wallet on Base L2.",
                            },
                        ].map((step) => (
                            <div key={step.num} className="flex gap-6 border-4 border-zinc-800 bg-zinc-900 p-6">
                                <div className="flex h-14 w-14 shrink-0 items-center justify-center border-4 border-accent font-mono text-2xl font-black text-accent">
                                    {step.num}
                                </div>
                                <div>
                                    <h3 className="font-mono text-lg font-black uppercase">{step.title}</h3>
                                    <p className="mt-2 font-mono text-xs uppercase leading-relaxed text-zinc-500">
                                        {step.desc}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
