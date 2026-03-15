import { useAccount, useChainId } from "wagmi";
import { useState, useEffect, useRef } from "react";
import { WalletButton } from "../components/WalletButton";
import {
    useETHBalance,
    useCreateCampaignV2,
    useActivateCampaignV2,
    usePauseCampaignV2,
    useWithdrawCampaignBudgetV2,
    generateCampaignId,
    calculateImpressions,
    ethToUsd,
    checkCampaignExists,
} from "../hooks/useContractsV2";
import { AdType, AD_TYPE_LABELS } from "../contracts/Web3AdsCoreV2";
import { uploadAdImage } from "../lib/supabase";

const API_URL = import.meta.env.VITE_API_URL || "https://api.web3ads.wtf";

// Store pending campaign details in a ref to prevent React state timing issues
interface PendingCampaignDetails {
    campaignId: `0x${string}`;
    name: string;
    adType: number;
    budget: string;
    imageUrl: string;
    targetUrl: string;
}

interface LocalCampaign {
    id: `0x${string}` | string;
    name: string;
    adType: number;
    budget: number;
    spent: number;
    impressions: number;
    imageUrl: string;
    targetUrl: string;
    status: "draft" | "pending" | "created" | "active" | "paused" | "completed";
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
    const chainId = useChainId();
    const { formattedBalance } = useETHBalance();

    // Form state
    const [campaignName, setCampaignName] = useState("");
    const [adType, setAdType] = useState<number>(AdType.BANNER);
    const [budget, setBudget] = useState(""); // Now in ETH
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [targetUrl, setTargetUrl] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Transaction state - no more approval step for ETH
    const [step, setStep] = useState<"idle" | "creating" | "activating">("idle");
    const [_pendingCampaignId, setPendingCampaignId] = useState<`0x${string}` | null>(null);

    // Use ref to store campaign details - survives all React re-renders
    const pendingCampaignRef = useRef<PendingCampaignDetails | null>(null);

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
                        status: c.status.toLowerCase() as "draft" | "active" | "paused" | "created" | "pending",
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

    // Contract hooks - V2 ETH-based
    const { createCampaign, isSuccess: createSuccess, reset: resetCreate } = useCreateCampaignV2();
    const { activateCampaign, isSuccess: activateSuccess } = useActivateCampaignV2();
    const { pauseCampaign, isSuccess: pauseSuccess, isPending: pausePending } = usePauseCampaignV2();
    const { withdrawBudget, isSuccess: withdrawSuccess, isPending: withdrawPending } = useWithdrawCampaignBudgetV2();

    // Track which campaign is being paused/withdrawn
    const [pausingCampaignId, setPausingCampaignId] = useState<string | null>(null);
    const [withdrawingCampaignId, setWithdrawingCampaignId] = useState<string | null>(null);

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

    // Handle create success - use ref for reliable data access
    useEffect(() => {
        if (createSuccess && step === "creating" && pendingCampaignRef.current && address) {
            const pending = pendingCampaignRef.current;
            console.log("[Advertiser] Create success! Campaign ID:", pending.campaignId);

            // Create campaign on server
            const createOnServer = async () => {
                try {
                    await fetch(`${API_URL}/api/campaigns`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            walletAddress: address,
                            name: pending.name,
                            adType: ["BANNER", "SQUARE", "SIDEBAR", "INTERSTITIAL"][pending.adType],
                            mediaUrl: pending.imageUrl || `https://picsum.photos/${pending.adType === 0 ? "728/90" : pending.adType === 1 ? "300/300" : pending.adType === 2 ? "300/600" : "800/600"}`,
                            targetUrl: pending.targetUrl || "https://web3ads.wtf",
                            budget: Number(pending.budget),
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
                    id: pending.campaignId,
                    name: pending.name,
                    adType: pending.adType,
                    budget: Number(pending.budget),
                    spent: 0,
                    impressions: 0,
                    imageUrl: pending.imageUrl,
                    targetUrl: pending.targetUrl,
                    status: "created",
                    createdAt: Date.now(),
                },
            ]);

            // CRITICAL: Add delay before activating to let wagmi hooks settle
            // This fixes the timing issue where the second transaction fails
            console.log("[Advertiser] Waiting 1 second before activation...");
            setTimeout(() => {
                console.log("[Advertiser] Now activating campaign:", pending.campaignId);
                setStep("activating");
                setPendingCampaignId(pending.campaignId);
                activateCampaign(pending.campaignId);
            }, 1000);
        }
    }, [createSuccess, step, address, activateCampaign]);

    // Handle activate success
    useEffect(() => {
        if (activateSuccess && step === "activating" && pendingCampaignRef.current) {
            const pending = pendingCampaignRef.current;
            console.log("[Advertiser] Activate success! Campaign:", pending.campaignId);

            // Activate on server
            const activateOnServer = async () => {
                try {
                    await fetch(`${API_URL}/api/campaigns/${pending.campaignId}/activate`, {
                        method: "POST",
                    });
                } catch (err) {
                    console.error("Failed to activate campaign on server:", err);
                }
            };
            activateOnServer();

            setCampaigns((prev) =>
                prev.map((c) =>
                    c.id === pending.campaignId ? { ...c, status: "active" as const } : c
                )
            );

            // Reset form
            setStep("idle");
            setPendingCampaignId(null);
            pendingCampaignRef.current = null;
            setCampaignName("");
            setBudget("");
            clearImage();
            setTargetUrl("");
            resetCreate();
        }
    }, [activateSuccess, step, resetCreate]);

    // Handle pause success
    useEffect(() => {
        if (pauseSuccess && pausingCampaignId) {
            console.log("[Advertiser] Pause success! Campaign:", pausingCampaignId);

            // Update server
            const updateServer = async () => {
                try {
                    await fetch(`${API_URL}/api/campaigns/${pausingCampaignId}/pause`, {
                        method: "POST",
                    });
                } catch (err) {
                    console.error("Failed to pause on server:", err);
                }
            };
            updateServer();

            setCampaigns((prev) =>
                prev.map((c) =>
                    c.id === pausingCampaignId ? { ...c, status: "paused" as const } : c
                )
            );
            setPausingCampaignId(null);
        }
    }, [pauseSuccess, pausingCampaignId]);

    // Handle withdraw success
    useEffect(() => {
        if (withdrawSuccess && withdrawingCampaignId) {
            console.log("[Advertiser] Withdraw success! Campaign:", withdrawingCampaignId);

            // Update local state - mark budget as 0 (withdrawn)
            setCampaigns((prev) =>
                prev.map((c) =>
                    c.id === withdrawingCampaignId ? { ...c, budget: c.spent, status: "completed" as const } : c
                )
            );
            setWithdrawingCampaignId(null);
            alert("Successfully withdrew remaining campaign budget!");
        }
    }, [withdrawSuccess, withdrawingCampaignId]);

    // Handle pausing a campaign
    const handlePauseCampaign = (campaign: LocalCampaign) => {
        if (!address) return;

        const campaignId = generateCampaignId(campaign.name, address);
        console.log("[Advertiser] Pausing campaign:", campaignId);
        setPausingCampaignId(campaign.id);
        pauseCampaign(campaignId);
    };

    // Handle withdrawing from a paused campaign
    const handleWithdrawCampaign = (campaign: LocalCampaign) => {
        if (!address) return;

        if (campaign.status !== "paused") {
            alert("Campaign must be paused before withdrawing. Please pause it first.");
            return;
        }

        const remaining = campaign.budget - campaign.spent;
        if (remaining <= 0) {
            alert("No remaining budget to withdraw.");
            return;
        }

        if (!confirm(`Withdraw ${remaining.toFixed(4)} ETH from this campaign?`)) return;

        const campaignId = generateCampaignId(campaign.name, address);
        console.log("[Advertiser] Withdrawing from campaign:", campaignId, "Amount:", remaining);
        setWithdrawingCampaignId(campaign.id);
        withdrawBudget(campaignId);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!campaignName || !budget || Number(budget) <= 0 || !address) {
            alert("Please fill all required fields with valid values.");
            return;
        }

        const campaignId = generateCampaignId(campaignName, address);

        // Store ALL campaign details in ref - this survives React re-renders
        pendingCampaignRef.current = {
            campaignId,
            name: campaignName,
            adType,
            budget,
            imageUrl: uploadedImageUrl || "",
            targetUrl,
        };

        console.log("[Advertiser] Checking if campaign exists:", campaignId);

        // Check if campaign already exists on blockchain
        const existingCampaign = await checkCampaignExists(chainId, address, campaignId);

        if (existingCampaign?.exists) {
            console.log("[Advertiser] Campaign already exists! Status:", existingCampaign.status);

            if (existingCampaign.status === 1) { // ACTIVE
                alert("A campaign with this name already exists and is ACTIVE. Please use a different name.");
                return;
            }

            // Campaign exists but is INACTIVE (0) or PAUSED (2) - skip create, just activate
            if (existingCampaign.status === 0) {
                console.log("[Advertiser] Campaign exists but INACTIVE, activating directly...");
                alert(`Campaign "${campaignName}" was already funded on blockchain. Activating it now...`);
                setPendingCampaignId(campaignId);
                setStep("activating");
                activateCampaign(campaignId);
                return;
            }

            if (existingCampaign.status === 2) { // PAUSED
                alert("A campaign with this name exists but is PAUSED. Go to your campaigns to resume it.");
                return;
            }
        }

        console.log("[Advertiser] Starting campaign creation:", campaignId);
        setPendingCampaignId(campaignId);

        // V2: Direct ETH deposit, no approval needed
        setStep("creating");
        createCampaign({
            campaignId,
            adType,
            budgetETH: budget,
        });
    };

    // Handle activating a DRAFT campaign (fund on blockchain + activate)
    const handleActivateDraft = async (campaign: LocalCampaign) => {
        if (!address) return;

        // Generate campaign ID from name (same as when creating)
        const campaignId = generateCampaignId(campaign.name, address);

        // Store ALL campaign details in ref
        pendingCampaignRef.current = {
            campaignId,
            name: campaign.name,
            adType: campaign.adType,
            budget: campaign.budget.toString(),
            imageUrl: campaign.imageUrl,
            targetUrl: campaign.targetUrl,
        };

        console.log("[Advertiser] Starting DRAFT campaign activation:", campaignId);
        setPendingCampaignId(campaignId);

        // Create and fund on blockchain
        setStep("creating");
        createCampaign({
            campaignId,
            adType: campaign.adType,
            budgetETH: campaign.budget.toString(),
        });
    };

    // Handle activating a campaign that's already funded on blockchain
    const handleActivateOnly = async (campaign: LocalCampaign) => {
        if (!address) return;

        // Generate campaign ID from name (same as when creating)
        const campaignId = generateCampaignId(campaign.name, address);

        // Store campaign details in ref
        pendingCampaignRef.current = {
            campaignId,
            name: campaign.name,
            adType: campaign.adType,
            budget: campaign.budget.toString(),
            imageUrl: campaign.imageUrl,
            targetUrl: campaign.targetUrl,
        };

        console.log("[Advertiser] Activating already-funded campaign:", campaignId);
        setPendingCampaignId(campaignId);

        // Just activate on blockchain (no funding)
        setStep("activating");
        activateCampaign(campaignId);

        // Also update server status
        try {
            await fetch(`${API_URL}/api/campaigns/${campaign.id}/activate`, {
                method: "POST",
            });
        } catch (err) {
            console.error("Failed to activate on server:", err);
        }
    };

    // Handle deleting a DRAFT campaign
    const handleDeleteCampaign = async (campaignId: string) => {
        if (!confirm("Are you sure you want to delete this campaign?")) return;

        try {
            const res = await fetch(`${API_URL}/api/campaigns/${campaignId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setCampaigns(prev => prev.filter(c => c.id !== campaignId));
            } else {
                alert("Failed to delete campaign");
            }
        } catch (err) {
            console.error("Failed to delete campaign:", err);
            alert("Failed to delete campaign");
        }
    };

    // Handle recovering/activating a campaign with manual ID from blockchain
    const [manualCampaignId, setManualCampaignId] = useState("");
    const [showRecoverForm, setShowRecoverForm] = useState(false);
    const [recoveringServerCampaignId, setRecoveringServerCampaignId] = useState<string | null>(null);

    const handleRecoverCampaign = async () => {
        if (!manualCampaignId || !address) return;

        // Ensure it starts with 0x
        let campaignId = manualCampaignId.trim();
        if (!campaignId.startsWith("0x")) {
            campaignId = "0x" + campaignId;
        }

        // Find any DRAFT campaign to link this to (for server sync)
        const draftCampaign = campaigns.find(c => c.status === "draft");
        if (draftCampaign) {
            setRecoveringServerCampaignId(draftCampaign.id);

            // Store campaign details in ref for the recovery
            pendingCampaignRef.current = {
                campaignId: campaignId as `0x${string}`,
                name: draftCampaign.name,
                adType: draftCampaign.adType,
                budget: draftCampaign.budget.toString(),
                imageUrl: draftCampaign.imageUrl,
                targetUrl: draftCampaign.targetUrl,
            };
        } else {
            // No draft campaign, just store minimal info
            pendingCampaignRef.current = {
                campaignId: campaignId as `0x${string}`,
                name: "Recovered Campaign",
                adType: 0,
                budget: "0",
                imageUrl: "",
                targetUrl: "",
            };
        }

        console.log("[Advertiser] Recovering campaign with manual ID:", campaignId);
        setPendingCampaignId(campaignId as `0x${string}`);
        setStep("activating");
        activateCampaign(campaignId as `0x${string}`);
    };

    // Handle successful recovery activation
    useEffect(() => {
        if (activateSuccess && recoveringServerCampaignId && pendingCampaignRef.current) {
            const pending = pendingCampaignRef.current;
            console.log("[Advertiser] Recovery success for:", pending.campaignId);

            // Update server campaign status
            const updateServer = async () => {
                try {
                    await fetch(`${API_URL}/api/campaigns/${recoveringServerCampaignId}/activate`, {
                        method: "POST",
                    });
                    setCampaigns(prev =>
                        prev.map(c =>
                            c.id === recoveringServerCampaignId ? { ...c, status: "active" as const } : c
                        )
                    );
                } catch (err) {
                    console.error("Failed to update server:", err);
                }
                setRecoveringServerCampaignId(null);
                setStep("idle");
                setShowRecoverForm(false);
                setManualCampaignId("");
                pendingCampaignRef.current = null;
            };
            updateServer();
        }
    }, [activateSuccess, recoveringServerCampaignId]);

    const isLoading = step !== "idle";
    const buttonText = step === "creating"
        ? "CREATING CAMPAIGN..."
        : step === "activating"
            ? "ACTIVATING..."
            : "CREATE & DEPOSIT ETH";

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
                        <p className="font-mono text-xs uppercase text-zinc-500">ETH BALANCE</p>
                        <p className="font-mono text-2xl font-black text-white">{(Number(formattedBalance) || 0).toFixed(4)} ETH</p>
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
                                    <option value={AdType.BANNER}>BANNER (728x90) - 0.5 ETH CPM ($1000)</option>
                                    <option value={AdType.SQUARE}>SQUARE (300x300) - 0.75 ETH CPM ($1500)</option>
                                    <option value={AdType.SIDEBAR}>SIDEBAR (300x600) - 1.0 ETH CPM ($2000)</option>
                                    <option value={AdType.INTERSTITIAL}>INTERSTITIAL - 2.0 ETH CPM ($4000)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                                    BUDGET (ETH) * <span className="text-zinc-600">Demo pricing</span>
                                </label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={budget}
                                    onChange={(e) => setBudget(e.target.value)}
                                    placeholder="0.1"
                                    min="0.001"
                                    className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#ff3e00] focus:outline-none"
                                    disabled={isLoading}
                                />
                                {budget && Number(budget) > 0 && (
                                    <p className="mt-1 font-mono text-xs text-zinc-500">
                                        ≈ {calculateImpressions(budget, adType).toLocaleString()} impressions | ~${ethToUsd(budget)} USD
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
                                disabled={isLoading || !campaignName || !budget || Number(budget) < 0.001 || !uploadedImageUrl}
                                className="w-full border-4 border-[#ff3e00] bg-[#ff3e00] py-4 font-mono text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-black disabled:cursor-not-allowed disabled:border-zinc-700 disabled:bg-zinc-800 disabled:text-zinc-500"
                            >
                                {buttonText}
                            </button>
                        </form>

                        {/* Recover Campaign Section */}
                        <div className="mt-6 border-t-2 border-zinc-700 pt-4">
                            <button
                                onClick={() => setShowRecoverForm(!showRecoverForm)}
                                className="font-mono text-xs text-zinc-500 hover:text-white"
                            >
                                {showRecoverForm ? "▼ HIDE RECOVER FORM" : "▶ RECOVER EXISTING CAMPAIGN"}
                            </button>
                            {showRecoverForm && (
                                <div className="mt-3 space-y-3">
                                    <p className="font-mono text-xs text-zinc-500">
                                        Paste the campaign ID from blockchain to activate an existing campaign:
                                    </p>
                                    <input
                                        type="text"
                                        value={manualCampaignId}
                                        onChange={(e) => setManualCampaignId(e.target.value)}
                                        placeholder="0xFBC3FC902FD5CE08..."
                                        className="w-full border-2 border-zinc-700 bg-black px-3 py-2 font-mono text-xs text-white placeholder-zinc-600 focus:border-green-500 focus:outline-none"
                                    />
                                    <button
                                        onClick={handleRecoverCampaign}
                                        disabled={isLoading || !manualCampaignId}
                                        className="w-full border-2 border-green-500 bg-green-500 py-2 font-mono text-xs font-bold uppercase text-white hover:bg-black disabled:opacity-50"
                                    >
                                        ACTIVATE WITH THIS ID
                                    </button>
                                </div>
                            )}
                        </div>
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
                                                                : campaign.status === "draft"
                                                                    ? "text-blue-400"
                                                                    : "text-zinc-500"
                                                        }`}
                                                >
                                                    {campaign.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="mt-3 flex gap-4 border-t border-zinc-800 pt-3">
                                                <div>
                                                    <span className="font-mono text-lg font-black text-[#ff3e00]">
                                                        {campaign.budget} ETH
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
                                                        {(campaign.spent || 0).toFixed(6)} ETH
                                                    </span>
                                                    <span className="ml-1 font-mono text-xs text-zinc-600">SPENT</span>
                                                </div>
                                            </div>
                                            {campaign.status === "draft" && (
                                                <div className="mt-3 flex flex-col gap-2 border-t border-zinc-800 pt-3">
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleActivateOnly(campaign)}
                                                            disabled={isLoading}
                                                            className="flex-1 border-2 border-green-500 bg-green-500 py-2 font-mono text-xs font-bold uppercase text-white hover:bg-black disabled:opacity-50"
                                                        >
                                                            ACTIVATE ONLY (ALREADY FUNDED)
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleActivateDraft(campaign)}
                                                            disabled={isLoading}
                                                            className="flex-1 border-2 border-[#ff3e00] bg-[#ff3e00] py-2 font-mono text-xs font-bold uppercase text-white hover:bg-black disabled:opacity-50"
                                                        >
                                                            FUND & ACTIVATE (NEW)
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCampaign(campaign.id)}
                                                            disabled={isLoading}
                                                            className="border-2 border-zinc-700 bg-black px-4 py-2 font-mono text-xs font-bold uppercase text-zinc-400 hover:border-red-500 hover:text-red-500 disabled:opacity-50"
                                                        >
                                                            DELETE
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                            {campaign.status === "active" && (
                                                <div className="mt-3 flex gap-2 border-t border-zinc-800 pt-3">
                                                    <button
                                                        onClick={() => handlePauseCampaign(campaign)}
                                                        disabled={pausePending && pausingCampaignId === campaign.id}
                                                        className="flex-1 border-2 border-orange-500 bg-orange-500 py-2 font-mono text-xs font-bold uppercase text-white hover:bg-black disabled:opacity-50"
                                                    >
                                                        {pausePending && pausingCampaignId === campaign.id ? "PAUSING..." : "⏸ PAUSE CAMPAIGN"}
                                                    </button>
                                                </div>
                                            )}
                                            {campaign.status === "paused" && (
                                                <div className="mt-3 flex flex-col gap-2 border-t border-zinc-800 pt-3">
                                                    <div className="font-mono text-xs text-zinc-400">
                                                        Remaining: <span className="text-yellow-400">{(campaign.budget - campaign.spent).toFixed(4)} ETH</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleActivateOnly(campaign)}
                                                            disabled={isLoading}
                                                            className="flex-1 border-2 border-green-500 bg-green-500 py-2 font-mono text-xs font-bold uppercase text-white hover:bg-black disabled:opacity-50"
                                                        >
                                                            ▶ RESUME
                                                        </button>
                                                        <button
                                                            onClick={() => handleWithdrawCampaign(campaign)}
                                                            disabled={withdrawPending && withdrawingCampaignId === campaign.id}
                                                            className="flex-1 border-2 border-red-500 bg-red-500 py-2 font-mono text-xs font-bold uppercase text-white hover:bg-black disabled:opacity-50"
                                                        >
                                                            {withdrawPending && withdrawingCampaignId === campaign.id ? "WITHDRAWING..." : "💰 WITHDRAW"}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
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
