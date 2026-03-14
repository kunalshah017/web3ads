import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { parseUnits } from "viem";
import { WalletButton } from "../components/WalletButton";
import {
    useUSDCBalance,
    useApproveUSDC,
    useCreateCampaign,
    useActivateCampaign,
    generateCampaignId,
} from "../hooks/useContracts";
import { AdType, CPM_RATES, AD_TYPE_LABELS } from "../contracts/Web3AdsCore";

interface LocalCampaign {
    id: `0x${string}`;
    name: string;
    adType: number;
    budget: number;
    imageUrl: string;
    targetUrl: string;
    status: "pending" | "created" | "active";
    createdAt: number;
}

export function AdvertiserPage() {
    const { isConnected, address } = useAccount();
    const { balance, allowance, formattedBalance, refetchAllowance } = useUSDCBalance();

    // Form state
    const [campaignName, setCampaignName] = useState("");
    const [adType, setAdType] = useState<number>(AdType.BANNER);
    const [budget, setBudget] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [targetUrl, setTargetUrl] = useState("");

    // Transaction state
    const [step, setStep] = useState<"idle" | "approving" | "creating" | "activating">("idle");
    const [pendingCampaignId, setPendingCampaignId] = useState<`0x${string}` | null>(null);

    // Local campaigns (in real app this would come from API)
    const [campaigns, setCampaigns] = useState<LocalCampaign[]>(() => {
        const stored = localStorage.getItem(`campaigns-${address}`);
        return stored ? JSON.parse(stored) : [];
    });

    // Contract hooks
    const { approve, isPending: isApproving, isSuccess: approveSuccess, isConfirming: approveConfirming } = useApproveUSDC();
    const { createCampaign, isPending: isCreating, isSuccess: createSuccess, isConfirming: createConfirming, reset: resetCreate } = useCreateCampaign();
    const { activateCampaign, isPending: isActivating, isSuccess: activateSuccess, isConfirming: activateConfirming } = useActivateCampaign();

    // Save campaigns to localStorage
    useEffect(() => {
        if (address) {
            localStorage.setItem(`campaigns-${address}`, JSON.stringify(campaigns));
        }
    }, [campaigns, address]);

    // Handle approve success
    useEffect(() => {
        if (approveSuccess && step === "approving") {
            refetchAllowance();
            setStep("creating");
            if (pendingCampaignId) {
                createCampaign({
                    campaignId: pendingCampaignId,
                    adType,
                    budgetUSDC: Number(budget),
                });
            }
        }
    }, [approveSuccess, step]);

    // Handle create success
    useEffect(() => {
        if (createSuccess && step === "creating" && pendingCampaignId) {
            // Add to local campaigns
            setCampaigns((prev) => [
                ...prev,
                {
                    id: pendingCampaignId,
                    name: campaignName,
                    adType,
                    budget: Number(budget),
                    imageUrl,
                    targetUrl,
                    status: "created",
                    createdAt: Date.now(),
                },
            ]);
            // Auto-activate
            setStep("activating");
            activateCampaign(pendingCampaignId);
        }
    }, [createSuccess, step, pendingCampaignId]);

    // Handle activate success
    useEffect(() => {
        if (activateSuccess && step === "activating" && pendingCampaignId) {
            setCampaigns((prev) =>
                prev.map((c) =>
                    c.id === pendingCampaignId ? { ...c, status: "active" as const } : c
                )
            );
            // Reset form
            setStep("idle");
            setPendingCampaignId(null);
            setCampaignName("");
            setBudget("");
            setImageUrl("");
            setTargetUrl("");
            resetCreate();
        }
    }, [activateSuccess, step, pendingCampaignId]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!campaignName || !budget || Number(budget) < 10) {
            alert("Please fill all required fields. Minimum budget is $10.");
            return;
        }

        const budgetInUnits = parseUnits(budget, 6);
        const campaignId = generateCampaignId(campaignName);
        setPendingCampaignId(campaignId);

        // Check if we need approval
        if (!allowance || allowance < budgetInUnits) {
            setStep("approving");
            approve(budgetInUnits);
        } else {
            setStep("creating");
            createCampaign({
                campaignId,
                adType,
                budgetUSDC: Number(budget),
            });
        }
    };

    const isLoading = step !== "idle";
    const buttonText = step === "approving"
        ? "APPROVING USDC..."
        : step === "creating"
            ? "CREATING CAMPAIGN..."
            : step === "activating"
                ? "ACTIVATING..."
                : "CREATE & DEPOSIT USDC";

    // Calculate stats
    const totalBudget = campaigns.reduce((sum, c) => sum + c.budget, 0);
    const activeCampaigns = campaigns.filter((c) => c.status === "active").length;

    if (!isConnected) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
                <div className="border-4 border-zinc-700 bg-zinc-900 p-12 text-center">
                    <h1 className="font-mono text-3xl font-black uppercase">ADVERTISER DASHBOARD</h1>
                    <p className="mt-4 font-mono text-sm uppercase text-zinc-500">
                        CONNECT YOUR WALLET TO CREATE CAMPAIGNS
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
                        <h1 className="font-mono text-3xl font-black uppercase">ADVERTISER DASHBOARD</h1>
                        <p className="mt-2 font-mono text-xs uppercase text-zinc-500">{address}</p>
                    </div>
                    <div className="text-right">
                        <p className="font-mono text-xs uppercase text-zinc-500">USDC BALANCE</p>
                        <p className="font-mono text-2xl font-black text-white">${formattedBalance}</p>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Create Campaign Form */}
                    <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
                        <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
                            CREATE CAMPAIGN
                        </h2>
                        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                            <div>
                                <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                                    CAMPAIGN NAME *
                                </label>
                                <input
                                    type="text"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    placeholder="My First Campaign"
                                    className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#ff3e00] focus:outline-none"
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                                    AD TYPE
                                </label>
                                <select
                                    value={adType}
                                    onChange={(e) => setAdType(Number(e.target.value))}
                                    className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white focus:border-[#ff3e00] focus:outline-none"
                                    disabled={isLoading}
                                >
                                    <option value={AdType.BANNER}>BANNER (728x90) - $2 CPM</option>
                                    <option value={AdType.SQUARE}>SQUARE (300x300) - $3 CPM</option>
                                    <option value={AdType.SIDEBAR}>SIDEBAR (300x600) - $4 CPM</option>
                                    <option value={AdType.INTERSTITIAL}>INTERSTITIAL - $8 CPM</option>
                                </select>
                            </div>
                            <div>
                                <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                                    BUDGET (USDC) * <span className="text-zinc-600">MIN $10</span>
                                </label>
                                <input
                                    type="number"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                    placeholder="100"
                                    min="10"
                                    className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#ff3e00] focus:outline-none"
                                    disabled={isLoading}
                                />
                                {budget && Number(budget) >= 10 && (
                                    <p className="mt-1 font-mono text-xs text-zinc-500">
                                        ≈ {Math.floor((Number(budget) * 1000) / (CPM_RATES[adType as keyof typeof CPM_RATES] / 1e6)).toLocaleString()} impressions
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                                    CREATIVE (IMAGE URL)
                                </label>
                                <input
                                    type="text"
                                    value={imageUrl}
                                    onChange={(e) => setImageUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#ff3e00] focus:outline-none"
                                    disabled={isLoading}
                                />
                            </div>
                            <div>
                                <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                                    TARGET URL
                                </label>
                                <input
                                    type="text"
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    placeholder="https://your-site.com"
                                    className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#ff3e00] focus:outline-none"
                                    disabled={isLoading}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isLoading || !campaignName || !budget || Number(budget) < 10}
                                className="w-full border-4 border-[#ff3e00] bg-[#ff3e00] py-4 font-mono text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-black disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500"
                            >
                                {buttonText}
                            </button>
                        </form>
                    </div>

                    {/* Campaigns List & Stats */}
                    <div className="space-y-6">
                        <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
                            <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
                                YOUR CAMPAIGNS
                            </h2>
                            {campaigns.length === 0 ? (
                                <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                                    <p className="font-mono text-sm font-bold uppercase text-zinc-500">NO CAMPAIGNS YET</p>
                                    <p className="mt-2 font-mono text-xs uppercase text-zinc-600">
                                        CREATE YOUR FIRST CAMPAIGN TO START ADVERTISING
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4 space-y-3">
                                    {campaigns.map((campaign) => (
                                        <div
                                            key={campaign.id}
                                            className="border-2 border-zinc-800 bg-black p-4"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <p className="font-mono text-sm font-bold uppercase text-white">
                                                        {campaign.name}
                                                    </p>
                                                    <p className="mt-1 font-mono text-xs uppercase text-zinc-500">
                                                        {AD_TYPE_LABELS[campaign.adType as keyof typeof AD_TYPE_LABELS]}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`font-mono text-xs font-bold uppercase ${campaign.status === "active"
                                                        ? "text-green-500"
                                                        : campaign.status === "created"
                                                            ? "text-yellow-500"
                                                            : "text-zinc-500"
                                                        }`}
                                                >
                                                    {campaign.status}
                                                </span>
                                            </div>
                                            <div className="mt-3 flex gap-4 border-t border-zinc-800 pt-3">
                                                <div>
                                                    <span className="font-mono text-lg font-black text-[#ff3e00]">
                                                        ${campaign.budget}
                                                    </span>
                                                    <span className="ml-1 font-mono text-xs text-zinc-600">BUDGET</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
                            <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
                                STATS
                            </h2>
                            <div className="mt-4 grid grid-cols-2 gap-4">
                                {[
                                    { value: activeCampaigns.toString(), label: "ACTIVE" },
                                    { value: `$${totalBudget}`, label: "TOTAL BUDGET" },
                                    { value: "0", label: "IMPRESSIONS" },
                                    { value: `$${totalBudget}`, label: "REMAINING" },
                                ].map((stat) => (
                                    <div key={stat.label} className="border-2 border-zinc-800 bg-black p-4 text-center">
                                        <span className="block font-mono text-2xl font-black text-[#ff3e00]">{stat.value}</span>
                                        <span className="font-mono text-xs uppercase text-zinc-600">{stat.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
