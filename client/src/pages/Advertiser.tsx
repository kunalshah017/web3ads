import { useAccount } from "wagmi";
import { useState, useEffect, useRef } from "react";
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
import { uploadAdImage } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface LocalCampaign {
    id: `0x${string}`;
    name: string;
    adType: number;
    budget: number;
    spent: number;
    impressions: number;
    imageUrl: string;
    targetUrl: string;
    status: "pending" | "created" | "active" | "paused";
    createdAt: number;
}

interface ServerCampaign {
    id: string;
    name: string;
    adType: string;
    budget: string;
    spent: string;
    status: string;
    mediaUrl: string;
    targetUrl: string;
    _count?: { impressions: number };
}

export function AdvertiserPage() {
    const { isConnected, address } = useAccount();
    const { allowance, formattedBalance, refetchAllowance } = useUSDCBalance();

    // Form state
    const [campaignName, setCampaignName] = useState("");
    const [adType, setAdType] = useState<number>(AdType.BANNER);
    const [budget, setBudget] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [targetUrl, setTargetUrl] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Transaction state
    const [step, setStep] = useState<"idle" | "approving" | "creating" | "activating">("idle");
    const [pendingCampaignId, setPendingCampaignId] = useState<`0x${string}` | null>(null);

    // Local campaigns (in real app this would come from API)
    const [campaigns, setCampaigns] = useState<LocalCampaign[]>([]);
    const [serverLoading, setServerLoading] = useState(false);

    // Fetch campaigns from server
    useEffect(() => {
        if (!address) return;

        const fetchCampaigns = async () => {
            setServerLoading(true);
            try {
                const res = await fetch(`${API_URL}/api/campaigns?walletAddress=${address}`);
                if (res.ok) {
                    const data = await res.json();
                    const serverCampaigns = (data.campaigns || []).map((c: ServerCampaign) => ({
                        id: c.id as `0x${string}`,
                        name: c.name,
                        adType: ["BANNER", "SQUARE", "SIDEBAR", "INTERSTITIAL"].indexOf(c.adType),
                        budget: Number(c.budget),
                        spent: Number(c.spent || 0),
                        impressions: c._count?.impressions || 0,
                        imageUrl: c.mediaUrl || "",
                        targetUrl: c.targetUrl || "",
                        status: c.status.toLowerCase() as "active" | "paused" | "created" | "pending",
                        createdAt: Date.now(),
                    }));
                    setCampaigns(serverCampaigns);
                }
            } catch (err) {
                console.error("Failed to fetch campaigns:", err);
                // Fall back to localStorage
                const stored = localStorage.getItem(`campaigns-${address}`);
                if (stored) setCampaigns(JSON.parse(stored));
            } finally {
                setServerLoading(false);
            }
        };

        fetchCampaigns();
    }, [address]);

    // Contract hooks
    const { approve, isSuccess: approveSuccess } = useApproveUSDC();
    const { createCampaign, isSuccess: createSuccess, reset: resetCreate } = useCreateCampaign();
    const { activateCampaign, isSuccess: activateSuccess } = useActivateCampaign();

    // Handle image file selection
    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith("image/")) {
            alert("Please select an image file");
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("Image must be smaller than 5MB");
            return;
        }

        // Preview the file

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);

        // Upload immediately
        if (address) {
            setIsUploading(true);
            try {
                const url = await uploadAdImage(file, address);
                setUploadedImageUrl(url);
            } catch (err) {
                console.error("Failed to upload image:", err);
                alert("Failed to upload image. Please try again.");
                setImagePreview(null);
            } finally {
                setIsUploading(false);
            }
        }
    };

    // Clear image
    const clearImage = () => {
        setImagePreview(null);
        setUploadedImageUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

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
        if (createSuccess && step === "creating" && pendingCampaignId && address) {
            // Create campaign on server
            const createOnServer = async () => {
                try {
                    await fetch(`${API_URL}/api/campaigns`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            walletAddress: address,
                            name: campaignName,
                            adType: ["BANNER", "SQUARE", "SIDEBAR", "INTERSTITIAL"][adType],
                            mediaUrl: uploadedImageUrl || `https://picsum.photos/${adType === 0 ? "728/90" : adType === 1 ? "300/300" : adType === 2 ? "300/600" : "800/600"}`,
                            targetUrl: targetUrl || "https://web3ads.wtf",
                            budget: Number(budget),
                        }),
                    });
                } catch (err) {
                    console.error("Failed to create campaign on server:", err);
                }
            };
            createOnServer();

            // Add to local campaigns
            setCampaigns((prev) => [
                ...prev,
                {
                    id: pendingCampaignId,
                    name: campaignName,
                    adType,
                    budget: Number(budget),
                    spent: 0,
                    impressions: 0,
                    imageUrl: uploadedImageUrl || "",
                    targetUrl,
                    status: "created",
                    createdAt: Date.now(),
                },
            ]);
            // Auto-activate
            setStep("activating");
            activateCampaign(pendingCampaignId);
        }
    }, [createSuccess, step, pendingCampaignId, address]);

    // Handle activate success
    useEffect(() => {
        if (activateSuccess && step === "activating" && pendingCampaignId) {
            // Activate on server
            const activateOnServer = async () => {
                try {
                    await fetch(`${API_URL}/api/campaigns/${pendingCampaignId}/activate`, {
                        method: "POST",
                    });
                } catch (err) {
                    console.error("Failed to activate campaign on server:", err);
                }
            };
            activateOnServer();

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
            clearImage();
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
    const totalSpent = campaigns.reduce((sum, c) => sum + (c.spent || 0), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
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
                                    CREATIVE (IMAGE)
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    className="hidden"
                                    disabled={isLoading}
                                    aria-label="Upload ad image"
                                />
                                {isUploading ? (
                                    <div className="mt-2 flex flex-col items-center justify-center border-4 border-dashed border-zinc-700 bg-black px-4 py-8">
                                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-600 border-t-[#ff3e00]"></div>
                                        <p className="mt-2 font-mono text-xs text-zinc-500">UPLOADING...</p>
                                    </div>
                                ) : !imagePreview ? (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="mt-2 flex cursor-pointer flex-col items-center justify-center border-4 border-dashed border-zinc-700 bg-black px-4 py-8 transition-colors hover:border-[#ff3e00]"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p className="mt-2 font-mono text-xs text-zinc-500">CLICK TO UPLOAD IMAGE</p>
                                        <p className="mt-1 font-mono text-xs text-zinc-600">PNG, JPG, GIF up to 5MB</p>
                                    </div>
                                ) : (
                                    <div className="mt-2 relative">
                                        <img
                                            src={imagePreview}
                                            alt="Ad preview"
                                            className="w-full max-h-48 object-contain border-4 border-zinc-700 bg-zinc-900"
                                        />
                                        <button
                                            type="button"
                                            onClick={clearImage}
                                            title="Remove image"
                                            className="absolute top-2 right-2 bg-black border-2 border-zinc-600 p-1 hover:border-[#ff3e00] hover:text-[#ff3e00] transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                        {uploadedImageUrl && (
                                            <p className="mt-1 font-mono text-xs text-green-500">✓ UPLOADED</p>
                                        )}
                                    </div>
                                )}
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
                                disabled={isLoading || !campaignName || !budget || Number(budget) < 10 || !uploadedImageUrl}
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
                            {serverLoading ? (
                                <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                                    <p className="font-mono text-sm font-bold uppercase text-zinc-500">LOADING...</p>
                                </div>
                            ) : campaigns.length === 0 ? (
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
                                                            : campaign.status === "paused"
                                                                ? "text-orange-500"
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
                                                <div>
                                                    <span className="font-mono text-lg font-black text-white">
                                                        {(campaign.impressions || 0).toLocaleString()}
                                                    </span>
                                                    <span className="ml-1 font-mono text-xs text-zinc-600">IMPS</span>
                                                </div>
                                                <div>
                                                    <span className="font-mono text-lg font-black text-zinc-400">
                                                        ${(campaign.spent || 0).toFixed(2)}
                                                    </span>
                                                    <span className="ml-1 font-mono text-xs text-zinc-600">SPENT</span>
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
                                    { value: `$${totalBudget.toFixed(2)}`, label: "TOTAL BUDGET" },
                                    { value: totalImpressions.toLocaleString(), label: "IMPRESSIONS" },
                                    { value: `$${(totalBudget - totalSpent).toFixed(2)}`, label: "REMAINING" },
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
