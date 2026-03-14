import { useAccount } from "wagmi";
import { WalletButton } from "../components/WalletButton";
import { useState, useEffect, useCallback } from "react";

interface ExtensionStatus {
    commitment?: string;
    isRegistered?: boolean;
    walletAddress?: string | null;
    totalEarnings?: number;
    viewedAdsCount?: number;
    error?: string;
}

export function ViewerPage() {
    const { address, isConnected } = useAccount();
    const [extensionInstalled, setExtensionInstalled] = useState(false);
    const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus | null>(null);
    const [isLinking, setIsLinking] = useState(false);
    const [linkingError, setLinkingError] = useState<string | null>(null);

    // Check if extension is installed
    useEffect(() => {
        const checkExtension = () => {
            // Extension injects __WEB3ADS_EXTENSION__ flag
            setExtensionInstalled(!!(window as typeof window & { __WEB3ADS_EXTENSION__?: boolean }).__WEB3ADS_EXTENSION__);
        };

        // Check immediately and after a short delay (extension might inject later)
        checkExtension();
        const timeout = setTimeout(checkExtension, 500);

        return () => clearTimeout(timeout);
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

    // Link wallet to extension
    const linkWallet = useCallback(async () => {
        if (!address || !extensionInstalled) return;

        setIsLinking(true);
        setLinkingError(null);

        const handleLinkResponse = (event: MessageEvent) => {
            if (event.data?.type === "WEB3ADS_WALLET_LINKED") {
                setIsLinking(false);
                if (event.data.success) {
                    setExtensionStatus((prev) => ({
                        ...prev,
                        walletAddress: address,
                        isRegistered: true,
                        commitment: event.data.commitment,
                    }));
                } else {
                    setLinkingError("Failed to link wallet. Please try again.");
                }
                window.removeEventListener("message", handleLinkResponse);
            }
        };

        window.addEventListener("message", handleLinkResponse);
        window.postMessage({
            type: "WEB3ADS_LINK_WALLET",
            walletAddress: address.toLowerCase(),
        }, "*");

        // Timeout after 10 seconds
        setTimeout(() => {
            setIsLinking(false);
            window.removeEventListener("message", handleLinkResponse);
        }, 10000);
    }, [address, extensionInstalled]);

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
                            {!isConnected ? (
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
