import { useState, useEffect } from "react";
import { Web3Ad, setApiUrl } from "web3ads-react";

// Set API URL for local development
setApiUrl(import.meta.env.VITE_API_URL || "http://localhost:3001");

// CPM rates from smart contract (in ETH)
const CPM_RATES = {
    banner: 0.5,      // $1000 CPM demo
    square: 0.75,     // $1500 CPM demo
    sidebar: 1.0,     // $2000 CPM demo
    interstitial: 2.0 // $4000 CPM demo
};

// Revenue splits
const PUBLISHER_SHARE = 0.50; // 50%
const VIEWER_SHARE = 0.20;    // 20%

// ETH price assumption for USD display
const ETH_PRICE_USD = 2000;

interface ImpressionRecord {
    id: string;
    type: string;
    timestamp: Date;
    publisherEarning: number;
    viewerEarning: number;
}

export function TestPage() {
    const [publisherWallet, setPublisherWallet] = useState("0x821813cE774ee6429386e5F4B08Efc5A3B15CD29");
    const [impressions, setImpressions] = useState<ImpressionRecord[]>([]);
    const [showInterstitial, setShowInterstitial] = useState(false);
    const [adKey, setAdKey] = useState(0); // Force re-render ads

    // Calculate earnings
    const calculateEarning = (type: keyof typeof CPM_RATES, share: number) => {
        const costPerImpression = CPM_RATES[type] / 1000;
        return costPerImpression * share;
    };

    const handleImpression = (adId: string, type: keyof typeof CPM_RATES) => {
        const publisherEarning = calculateEarning(type, PUBLISHER_SHARE);
        const viewerEarning = calculateEarning(type, VIEWER_SHARE);

        setImpressions((prev) => [...prev, {
            id: adId,
            type: type.toUpperCase(),
            timestamp: new Date(),
            publisherEarning,
            viewerEarning
        }]);
    };

    // Totals
    const totalPublisherEarnings = impressions.reduce((sum, i) => sum + i.publisherEarning, 0);
    const totalViewerEarnings = impressions.reduce((sum, i) => sum + i.viewerEarning, 0);

    // Refresh all ads
    const refreshAds = () => {
        setAdKey(prev => prev + 1);
    };

    // Show interstitial every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setShowInterstitial(true);
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen bg-[#0a0a0a]">
            {/* Interstitial Overlay */}
            {showInterstitial && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
                    <div className="relative">
                        <button
                            onClick={() => setShowInterstitial(false)}
                            className="absolute -top-12 right-0 border-2 border-white px-4 py-2 font-mono text-xs font-bold uppercase text-white hover:bg-white hover:text-black"
                        >
                            CLOSE AD [X]
                        </button>
                        <Web3Ad
                            key={`interstitial-${adKey}`}
                            publisherWallet={publisherWallet as `0x${string}`}
                            type="interstitial"
                            category="featured"
                            onImpression={(adId) => handleImpression(adId, "interstitial")}
                            onError={(err: Error) => console.error("Ad error:", err)}
                        />
                    </div>
                </div>
            )}

            {/* Publisher Site Header */}
            <header className="border-b-4 border-[#ff3e00] bg-black px-6 py-4">
                <div className="mx-auto flex max-w-7xl items-center justify-between">
                    <div>
                        <h1 className="font-mono text-2xl font-black uppercase tracking-tight text-white">
                            DEMO PUBLISHER SITE
                        </h1>
                        <p className="font-mono text-xs text-zinc-500">
                            SIMULATING A WEBSITE WITH WEB3ADS INTEGRATION
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <a
                            href="/"
                            className="border-2 border-zinc-700 px-4 py-2 font-mono text-xs font-bold uppercase text-zinc-400 hover:border-white hover:text-white"
                        >
                            ← BACK TO APP
                        </a>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-6 py-8">
                <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
                    {/* Main Content Area */}
                    <div className="space-y-8">
                        {/* Top Banner Ad */}
                        <div className="border-4 border-dashed border-zinc-800 bg-zinc-900/50 p-2">
                            <div className="mb-1 font-mono text-[10px] uppercase text-zinc-600">BANNER AD (728×90) - 0.5 ETH CPM</div>
                            <Web3Ad
                                key={`banner-${adKey}`}
                                publisherWallet={publisherWallet as `0x${string}`}
                                type="banner"
                                category="crypto"
                                onImpression={(adId) => handleImpression(adId, "banner")}
                                onError={(err: Error) => console.error("Ad error:", err)}
                            />
                        </div>

                        {/* Fake Article Content */}
                        <article className="border-4 border-zinc-800 bg-zinc-900 p-8">
                            <h2 className="font-mono text-3xl font-black uppercase text-white">
                                SAMPLE ARTICLE CONTENT
                            </h2>
                            <p className="mt-4 font-mono text-sm leading-relaxed text-zinc-400">
                                This simulates a publisher's website with Web3Ads integration.
                                The ads displayed on this page are fetched from active campaigns
                                and impressions are recorded on-chain.
                            </p>
                            <div className="mt-6 grid gap-6 md:grid-cols-2">
                                <div className="border-2 border-zinc-700 p-4">
                                    <h3 className="font-mono text-lg font-bold uppercase text-[#ff3e00]">
                                        PUBLISHER BENEFITS
                                    </h3>
                                    <ul className="mt-2 space-y-2 font-mono text-xs text-zinc-400">
                                        <li>• 50% revenue share</li>
                                        <li>• Instant ETH payments</li>
                                        <li>• No middlemen</li>
                                        <li>• Transparent on-chain tracking</li>
                                    </ul>
                                </div>
                                <div className="border-2 border-zinc-700 p-4">
                                    <h3 className="font-mono text-lg font-bold uppercase text-[#ff3e00]">
                                        VIEWER BENEFITS
                                    </h3>
                                    <ul className="mt-2 space-y-2 font-mono text-xs text-zinc-400">
                                        <li>• 20% revenue share</li>
                                        <li>• Privacy-preserving</li>
                                        <li>• Zero-knowledge proofs</li>
                                        <li>• Gasless withdrawals</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Square Ad in content */}
                            <div className="mx-auto mt-8 w-fit border-4 border-dashed border-zinc-800 bg-zinc-900/50 p-2">
                                <div className="mb-1 font-mono text-[10px] uppercase text-zinc-600">SQUARE AD (300×300) - 0.75 ETH CPM</div>
                                <Web3Ad
                                    key={`square-${adKey}`}
                                    publisherWallet={publisherWallet as `0x${string}`}
                                    type="square"
                                    category="nft"
                                    onImpression={(adId) => handleImpression(adId, "square")}
                                    onError={(err: Error) => console.error("Ad error:", err)}
                                />
                            </div>

                            <p className="mt-8 font-mono text-sm leading-relaxed text-zinc-400">
                                Web3Ads revolutionizes digital advertising by creating a fair
                                ecosystem where advertisers, publishers, and viewers all benefit.
                                Smart contracts ensure transparent revenue distribution.
                            </p>
                        </article>

                        {/* Another Banner */}
                        <div className="border-4 border-dashed border-zinc-800 bg-zinc-900/50 p-2">
                            <div className="mb-1 font-mono text-[10px] uppercase text-zinc-600">BANNER AD (728×90) - 0.5 ETH CPM</div>
                            <Web3Ad
                                key={`banner2-${adKey}`}
                                publisherWallet={publisherWallet as `0x${string}`}
                                type="banner"
                                category="defi"
                                onImpression={(adId) => handleImpression(adId, "banner")}
                                onError={(err: Error) => console.error("Ad error:", err)}
                            />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <aside className="space-y-6">
                        {/* Sidebar Ad */}
                        <div className="border-4 border-dashed border-zinc-800 bg-zinc-900/50 p-2">
                            <div className="mb-1 font-mono text-[10px] uppercase text-zinc-600">SIDEBAR AD (300×600) - 1.0 ETH CPM</div>
                            <Web3Ad
                                key={`sidebar-${adKey}`}
                                publisherWallet={publisherWallet as `0x${string}`}
                                type="sidebar"
                                category="gaming"
                                onImpression={(adId) => handleImpression(adId, "sidebar")}
                                onError={(err: Error) => console.error("Ad error:", err)}
                            />
                        </div>

                        {/* Earnings Dashboard */}
                        <div className="border-4 border-[#ff3e00] bg-black p-4">
                            <h3 className="border-b-2 border-zinc-800 pb-2 font-mono text-sm font-black uppercase text-[#ff3e00]">
                                LIVE EARNINGS
                            </h3>

                            <div className="mt-4 space-y-4">
                                {/* Publisher Earnings */}
                                <div className="border-2 border-zinc-800 bg-zinc-900 p-3">
                                    <div className="font-mono text-[10px] uppercase text-zinc-500">PUBLISHER (50%)</div>
                                    <div className="mt-1 font-mono text-xl font-black text-green-400">
                                        {totalPublisherEarnings.toFixed(6)} ETH
                                    </div>
                                    <div className="font-mono text-xs text-zinc-500">
                                        ≈ ${(totalPublisherEarnings * ETH_PRICE_USD).toFixed(2)} USD
                                    </div>
                                </div>

                                {/* Viewer Earnings */}
                                <div className="border-2 border-zinc-800 bg-zinc-900 p-3">
                                    <div className="font-mono text-[10px] uppercase text-zinc-500">VIEWER (20%)</div>
                                    <div className="mt-1 font-mono text-xl font-black text-blue-400">
                                        {totalViewerEarnings.toFixed(6)} ETH
                                    </div>
                                    <div className="font-mono text-xs text-zinc-500">
                                        ≈ ${(totalViewerEarnings * ETH_PRICE_USD).toFixed(2)} USD
                                    </div>
                                </div>

                                {/* Total Impressions */}
                                <div className="border-t-2 border-zinc-800 pt-3">
                                    <div className="flex justify-between font-mono text-xs uppercase">
                                        <span className="text-zinc-500">IMPRESSIONS</span>
                                        <span className="font-bold text-white">{impressions.length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="border-4 border-zinc-800 bg-zinc-900 p-4">
                            <h3 className="border-b-2 border-zinc-800 pb-2 font-mono text-sm font-black uppercase text-white">
                                DEMO CONTROLS
                            </h3>

                            <div className="mt-4 space-y-3">
                                <div>
                                    <label className="font-mono text-[10px] uppercase text-zinc-500">
                                        PUBLISHER WALLET
                                    </label>
                                    <input
                                        type="text"
                                        value={publisherWallet}
                                        onChange={(e) => setPublisherWallet(e.target.value)}
                                        placeholder="0x..."
                                        className="mt-1 w-full border-2 border-zinc-700 bg-black px-2 py-1 font-mono text-[10px] text-white"
                                    />
                                </div>

                                <button
                                    onClick={refreshAds}
                                    className="w-full border-2 border-zinc-600 bg-black py-2 font-mono text-xs font-bold uppercase text-white hover:border-white"
                                >
                                    REFRESH ADS
                                </button>

                                <button
                                    onClick={() => setShowInterstitial(true)}
                                    className="w-full border-2 border-[#ff3e00] bg-[#ff3e00] py-2 font-mono text-xs font-bold uppercase text-white hover:bg-black"
                                >
                                    SHOW INTERSTITIAL
                                </button>

                                <button
                                    onClick={() => setImpressions([])}
                                    className="w-full border-2 border-zinc-700 bg-black py-2 font-mono text-xs font-bold uppercase text-zinc-400 hover:text-white"
                                >
                                    RESET STATS
                                </button>
                            </div>
                        </div>

                        {/* CPM Reference */}
                        <div className="border-4 border-zinc-800 bg-zinc-900 p-4">
                            <h3 className="border-b-2 border-zinc-800 pb-2 font-mono text-sm font-black uppercase text-white">
                                CPM RATES (DEMO)
                            </h3>
                            <div className="mt-3 space-y-2 font-mono text-xs">
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">BANNER</span>
                                    <span className="text-white">0.5 ETH</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">SQUARE</span>
                                    <span className="text-white">0.75 ETH</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">SIDEBAR</span>
                                    <span className="text-white">1.0 ETH</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-zinc-500">INTERSTITIAL</span>
                                    <span className="text-white">2.0 ETH</span>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>

                {/* Impression Log */}
                <div className="mt-8 border-4 border-zinc-800 bg-zinc-900 p-4">
                    <h3 className="border-b-2 border-zinc-800 pb-2 font-mono text-sm font-black uppercase text-white">
                        IMPRESSION LOG
                    </h3>
                    <div className="mt-3 max-h-40 overflow-y-auto">
                        {impressions.length === 0 ? (
                            <p className="font-mono text-xs text-zinc-600">
                                Scroll to view ads and generate impressions...
                            </p>
                        ) : (
                            <div className="space-y-1">
                                {impressions.map((imp, i) => (
                                    <div key={i} className="flex items-center justify-between border-b border-zinc-800 py-1 font-mono text-xs">
                                        <span className="text-green-500">✓ {imp.type}</span>
                                        <span className="text-zinc-500">{imp.timestamp.toLocaleTimeString()}</span>
                                        <span className="text-green-400">+{imp.publisherEarning.toFixed(6)} ETH</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="mt-8 border-t-4 border-zinc-800 bg-black px-6 py-4">
                <div className="mx-auto max-w-7xl text-center font-mono text-xs text-zinc-600">
                    POWERED BY WEB3ADS • DECENTRALIZED ADVERTISING PROTOCOL
                </div>
            </footer>
        </div>
    );
}
