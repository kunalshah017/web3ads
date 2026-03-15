import { useAccount } from "wagmi";
import { useState, useEffect, useCallback } from "react";
import { WalletButton } from "../components/WalletButton";
import { Link } from "react-router-dom";
import { useETHBalance } from "../hooks/useContractsV2";
import { usePublisherBalance } from "../hooks/useContracts";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface ServerCampaign {
    id: string;
    name: string;
    adType: string;
    budget: string;
    spent: string;
    status: string;
    _count?: { impressions: number };
}

interface PublisherStats {
    totalViews: number;
    totalEarnings: number;
    pendingBalance: number;
    claimedBalance: number;
}

interface ExtensionStatus {
    hasIdentity?: boolean;
    totalEarnings?: number;
    viewedAdsCount?: number;
    walletAddress?: string | null;
}

export function DashboardPage() {
    const { isConnected, address } = useAccount();
    const { formattedBalance: ethBalance } = useETHBalance();
    const { formattedBalance: publisherOnChainBalance } = usePublisherBalance();

    // Advertiser state
    const [activeCampaigns, setActiveCampaigns] = useState(0);
    const [totalImpressions, setTotalImpressions] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);

    // Publisher state
    const [pubStats, setPubStats] = useState<PublisherStats | null>(null);

    // Viewer state
    const [extensionInstalled, setExtensionInstalled] = useState(false);
    const [extensionStatus, setExtensionStatus] = useState<ExtensionStatus | null>(null);

    // Fetch advertiser campaigns
    const fetchCampaigns = useCallback(async () => {
        if (!address) return;
        try {
            const res = await fetch(`${API_URL}/api/campaigns?walletAddress=${address}`);
            if (!res.ok) return;
            const data = await res.json();
            const campaigns: ServerCampaign[] = data.campaigns || [];
            setActiveCampaigns(campaigns.filter((c) => c.status.toLowerCase() === "active").length);
            setTotalImpressions(campaigns.reduce((sum, c) => sum + (c._count?.impressions || 0), 0));
            setTotalSpent(campaigns.reduce((sum, c) => sum + Number(c.spent || 0), 0));
        } catch (err) {
            console.error("Dashboard: failed to fetch campaigns:", err);
        }
    }, [address]);

    // Fetch publisher stats
    const fetchPublisherStats = useCallback(async () => {
        if (!address) return;
        try {
            const res = await fetch(`${API_URL}/api/publishers/profile?walletAddress=${address}`);
            if (res.ok) {
                const data = await res.json();
                setPubStats({
                    totalViews: data.publisher?.totalViews || 0,
                    totalEarnings: Number(data.publisher?.totalEarnings || 0),
                    pendingBalance: Number(data.publisher?.pendingBalance || 0),
                    claimedBalance: Number(data.publisher?.claimedBalance || 0),
                });
            }
        } catch (err) {
            console.error("Dashboard: failed to fetch publisher stats:", err);
        }
    }, [address]);

    useEffect(() => {
        void fetchCampaigns();
        void fetchPublisherStats();
    }, [fetchCampaigns, fetchPublisherStats]);

    // Check extension status
    useEffect(() => {
        const checkExtension = () => {
            const hasAttribute = document.documentElement.hasAttribute("data-web3ads-extension");
            setExtensionInstalled(hasAttribute);
        };

        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === "WEB3ADS_EXTENSION_READY") {
                setExtensionInstalled(true);
            }
            if (event.data?.type === "WEB3ADS_STATUS_RESPONSE") {
                setExtensionStatus(event.data);
            }
        };

        window.addEventListener("message", handleMessage);
        checkExtension();
        const timeout = setTimeout(checkExtension, 500);
        window.postMessage({ type: "WEB3ADS_CHECK_EXTENSION" }, "*");

        return () => {
            clearTimeout(timeout);
            window.removeEventListener("message", handleMessage);
        };
    }, []);

    useEffect(() => {
        if (!extensionInstalled) return;
        window.postMessage({ type: "WEB3ADS_GET_STATUS" }, "*");
    }, [extensionInstalled]);

    const viewerAdsViewed = extensionStatus?.viewedAdsCount ?? 0;
    const viewerEarnings = extensionStatus?.totalEarnings ?? 0;
    const pubEarnings = pubStats?.totalEarnings ?? 0;
    const totalBalance = pubEarnings + viewerEarnings;

    if (!isConnected) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
                <div className="border-4 border-zinc-700 bg-zinc-900 p-12 text-center">
                    <h1 className="font-mono text-3xl font-black uppercase">DASHBOARD</h1>
                    <p className="mt-4 font-mono text-sm uppercase text-zinc-500">
                        CONNECT YOUR WALLET TO VIEW YOUR ACTIVITY
                    </p>
                    <div className="mt-6">
                        <WalletButton />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="px-6 py-8">
            <div className="mx-auto max-w-5xl">
                <div className="mb-8 flex items-start justify-between border-b-4 border-zinc-800 pb-4">
                    <div>
                        <h1 className="font-mono text-3xl font-black uppercase">DASHBOARD</h1>
                        <p className="mt-2 font-mono text-xs uppercase text-zinc-500">{address}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-mono text-xs uppercase text-zinc-500">ETH BALANCE</p>
                        <p className="font-mono text-2xl font-black text-white">{Number(ethBalance).toFixed(4)} ETH</p>
                    </div>
                </div>

                {/* Overview Cards */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Total Balance */}
                    <div className="border-4 border-[#ff3e00] bg-zinc-900 p-6">
                        <h2 className="font-mono text-lg font-black uppercase">TOTAL BALANCE</h2>
                        <div className="mt-4 flex items-baseline gap-2">
                            <span className="font-mono text-5xl font-black text-[#ff3e00]">${totalBalance.toFixed(4)}</span>
                            <span className="font-mono text-sm uppercase text-zinc-500">USDC</span>
                        </div>
                        <div className="mt-6 space-y-2 border-t-2 border-zinc-700 pt-4">
                            <div className="flex justify-between font-mono text-xs uppercase">
                                <span className="text-zinc-500">Publisher Earnings</span>
                                <span className="text-white">${pubStats ? pubStats.totalEarnings.toFixed(4) : "0.00"}</span>
                            </div>
                            <div className="flex justify-between font-mono text-xs uppercase">
                                <span className="text-zinc-500">Viewer Earnings</span>
                                <span className="text-white">
                                    {extensionInstalled ? `$${viewerEarnings.toFixed(2)}` : "—"}
                                </span>
                            </div>
                        </div>
                        <button
                            disabled
                            className="mt-6 w-full border-4 border-zinc-700 bg-zinc-800 py-3 font-mono text-xs font-bold uppercase tracking-wider text-zinc-500 transition-all disabled:cursor-not-allowed"
                        >
                            WITHDRAW ALL
                        </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
                        <h2 className="font-mono text-lg font-black uppercase">QUICK ACTIONS</h2>
                        <div className="mt-4 grid gap-3">
                            <Link
                                to="/advertiser"
                                className="flex items-center gap-4 border-4 border-zinc-700 bg-black p-4 no-underline transition-all hover:border-white"
                            >
                                <span className="text-2xl">📣</span>
                                <span className="font-mono text-xs font-bold uppercase text-white">CREATE CAMPAIGN</span>
                            </Link>
                            <Link
                                to="/publisher"
                                className="flex items-center gap-4 border-4 border-zinc-700 bg-black p-4 no-underline transition-all hover:border-white"
                            >
                                <span className="text-2xl">📋</span>
                                <span className="font-mono text-xs font-bold uppercase text-white">GET EMBED CODE</span>
                            </Link>
                            <Link
                                to="/viewer"
                                className="flex items-center gap-4 border-4 border-zinc-700 bg-black p-4 no-underline transition-all hover:border-white"
                            >
                                <span className="text-2xl">🧩</span>
                                <span className="font-mono text-xs font-bold uppercase text-white">
                                    {extensionInstalled ? "VIEW EXTENSION STATUS" : "INSTALL EXTENSION"}
                                </span>
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Activity Sections */}
                <div className="mt-8 grid gap-6 md:grid-cols-3">
                    {/* Advertiser Activity */}
                    <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
                        <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-sm font-black uppercase">
                            ADVERTISER
                        </h2>
                        <div className="mt-4 space-y-4">
                            {[
                                { value: activeCampaigns.toString(), label: "Active Campaigns" },
                                { value: totalImpressions.toLocaleString(), label: "Total Impressions" },
                                { value: `$${totalSpent.toFixed(2)}`, label: "Total Spent" },
                            ].map((stat) => (
                                <div key={stat.label} className="flex items-center justify-between">
                                    <span className="font-mono text-xs uppercase text-zinc-500">{stat.label}</span>
                                    <span className="font-mono text-lg font-black text-white">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                        <Link
                            to="/advertiser"
                            className="mt-4 block font-mono text-xs font-bold uppercase text-[#ff3e00] no-underline transition-all hover:text-white"
                        >
                            MANAGE CAMPAIGNS →
                        </Link>
                    </div>

                    {/* Publisher Activity */}
                    <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
                        <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-sm font-black uppercase">
                            PUBLISHER
                        </h2>
                        <div className="mt-4 space-y-4">
                            {[
                                { value: pubStats ? pubStats.totalViews.toLocaleString() : "0", label: "Total Views" },
                                { value: `$${pubStats ? pubStats.totalEarnings.toFixed(4) : "0.00"}`, label: "Earned" },
                                { value: `$${publisherOnChainBalance}`, label: "Pending" },
                            ].map((stat) => (
                                <div key={stat.label} className="flex items-center justify-between">
                                    <span className="font-mono text-xs uppercase text-zinc-500">{stat.label}</span>
                                    <span className="font-mono text-lg font-black text-white">{stat.value}</span>
                                </div>
                            ))}
                        </div>
                        <Link
                            to="/publisher"
                            className="mt-4 block font-mono text-xs font-bold uppercase text-[#ff3e00] no-underline transition-all hover:text-white"
                        >
                            VIEW EARNINGS →
                        </Link>
                    </div>

                    {/* Viewer Activity */}
                    <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
                        <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-sm font-black uppercase">
                            VIEWER
                        </h2>
                        <div className="mt-4 space-y-4">
                            {extensionInstalled ? (
                                <>
                                    {[
                                        { value: viewerAdsViewed.toString(), label: "Ads Viewed" },
                                        { value: `$${viewerEarnings.toFixed(2)}`, label: "Earned" },
                                        { value: "ACTIVE", label: "Extension" },
                                    ].map((stat) => (
                                        <div key={stat.label} className="flex items-center justify-between">
                                            <span className="font-mono text-xs uppercase text-zinc-500">{stat.label}</span>
                                            <span className="font-mono text-lg font-black text-white">{stat.value}</span>
                                        </div>
                                    ))}
                                </>
                            ) : (
                                <div className="flex min-h-[80px] flex-col items-center justify-center text-center">
                                    <p className="font-mono text-xs font-bold uppercase text-zinc-500">NO EXTENSION DETECTED</p>
                                    <p className="mt-1 font-mono text-xs uppercase text-zinc-600">INSTALL TO START EARNING</p>
                                </div>
                            )}
                        </div>
                        <Link
                            to="/viewer"
                            className="mt-4 block font-mono text-xs font-bold uppercase text-[#ff3e00] no-underline transition-all hover:text-white"
                        >
                            {extensionInstalled ? "VIEW DETAILS →" : "INSTALL EXTENSION →"}
                        </Link>
                    </div>
                </div>

                {/* Recent Transactions */}
                <div className="mt-8 border-4 border-zinc-700 bg-zinc-900 p-6">
                    <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
                        RECENT TRANSACTIONS
                    </h2>
                    <div className="flex min-h-[100px] items-center justify-center">
                        <p className="font-mono text-sm font-bold uppercase text-zinc-500">NO TRANSACTIONS YET</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
