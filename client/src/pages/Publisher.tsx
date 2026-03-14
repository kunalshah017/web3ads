import { useAccount } from "wagmi";
import { WalletButton } from "../components/WalletButton";
import { useState } from "react";
import { usePublisherBalance, usePublisherWithdraw } from "../hooks/useContracts";

export function PublisherPage() {
    const { isConnected, address } = useAccount();
    const [selectedType, setSelectedType] = useState("banner");
    const { balance, formattedBalance, refetch } = usePublisherBalance();
    const { withdraw, isPending, isConfirming, isSuccess } = usePublisherWithdraw();

    const MIN_WITHDRAWAL = 10_000_000n; // 10 USDC
    const canWithdraw = balance && balance >= MIN_WITHDRAWAL;

    const embedCode = `import { Web3Ad } from 'web3ads-react';

<Web3Ad
  publisherWallet="${address || "0x..."}"
  type="${selectedType}"
  category="defi"
/>`;

    // Refetch balance on successful withdrawal
    if (isSuccess) {
        refetch();
    }

    if (!isConnected) {
        return (
            <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
                <div className="border-4 border-zinc-700 bg-zinc-900 p-12 text-center">
                    <h1 className="font-mono text-3xl font-black uppercase">PUBLISHER DASHBOARD</h1>
                    <p className="mt-4 font-mono text-sm uppercase text-zinc-500">
                        CONNECT YOUR WALLET TO START EARNING
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
                <div className="mb-8 border-b-4 border-zinc-800 pb-4">
                    <h1 className="font-mono text-3xl font-black uppercase">PUBLISHER DASHBOARD</h1>
                    <p className="mt-2 font-mono text-xs uppercase text-zinc-500">{address}</p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Embed Code */}
                    <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
                        <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
                            GET EMBED CODE
                        </h2>
                        <div className="mt-6">
                            <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                                SELECT AD TYPE
                            </label>
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white focus:border-[#ff3e00] focus:outline-none"
                            >
                                <option value="banner">BANNER (728x90)</option>
                                <option value="square">SQUARE (300x300)</option>
                                <option value="sidebar">SIDEBAR (300x600)</option>
                            </select>
                        </div>

                        <div className="mt-6">
                            <pre className="overflow-x-auto border-4 border-zinc-800 bg-black p-4 font-mono text-xs text-zinc-300">
                                {embedCode}
                            </pre>
                            <button
                                onClick={() => navigator.clipboard.writeText(embedCode)}
                                className="mt-4 w-full border-4 border-white bg-black py-3 font-mono text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-black"
                            >
                                COPY CODE
                            </button>
                        </div>

                        <div className="mt-6 space-y-2 border-t-2 border-zinc-700 pt-4">
                            <p className="font-mono text-xs uppercase text-zinc-400">
                                <span className="text-[#ff3e00]">1.</span> Install: npm i web3ads-react
                            </p>
                            <p className="font-mono text-xs uppercase text-zinc-400">
                                <span className="text-[#ff3e00]">2.</span> Add the component to your site
                            </p>
                            <p className="font-mono text-xs uppercase text-zinc-400">
                                <span className="text-[#ff3e00]">3.</span> Earn 50% of every ad view
                            </p>
                        </div>
                    </div>

                    {/* Earnings */}
                    <div className="space-y-6">
                        <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
                            <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
                                YOUR EARNINGS
                            </h2>
                            <div className="mt-6 text-center">
                                <span className="block font-mono text-5xl font-black text-[#ff3e00]">${formattedBalance}</span>
                                <span className="font-mono text-xs uppercase text-zinc-500">PENDING USDC</span>
                            </div>

                            <div className="mt-6 space-y-2 border-t-2 border-zinc-700 pt-4">
                                <div className="flex justify-between font-mono text-xs uppercase">
                                    <span className="text-zinc-500">TOTAL VIEWS</span>
                                    <span className="text-white">0</span>
                                </div>
                                <div className="flex justify-between font-mono text-xs uppercase">
                                    <span className="text-zinc-500">TOTAL EARNED</span>
                                    <span className="text-white">${formattedBalance}</span>
                                </div>
                                <div className="flex justify-between font-mono text-xs uppercase">
                                    <span className="text-zinc-500">CLAIMED</span>
                                    <span className="text-white">$0.00</span>
                                </div>
                            </div>

                            <button
                                onClick={() => withdraw()}
                                disabled={!canWithdraw || isPending || isConfirming}
                                className={`mt-6 w-full border-4 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all ${canWithdraw
                                    ? "border-[#ff3e00] bg-[#ff3e00] text-white hover:bg-black"
                                    : "border-zinc-700 bg-zinc-800 text-zinc-500 cursor-not-allowed"
                                    }`}
                            >
                                {isPending || isConfirming
                                    ? "WITHDRAWING..."
                                    : `WITHDRAW${!canWithdraw ? " (MIN $10)" : ""}`}
                            </button>
                        </div>

                        {/* Ad Preview */}
                        <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
                            <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
                                AD PREVIEW
                            </h2>
                            <div className="mt-6 flex items-center justify-center">
                                <div
                                    className={`flex items-center justify-center border-4 border-dashed border-zinc-600 bg-zinc-800 font-mono text-xs uppercase text-zinc-500 ${selectedType === "banner" ? "h-[90px] w-full max-w-[728px]" : ""
                                        } ${selectedType === "square" ? "h-[200px] w-[200px]" : ""} ${selectedType === "sidebar" ? "h-[300px] w-[150px]" : ""
                                        }`}
                                >
                                    <div className="text-center">
                                        <div>YOUR AD SPOT</div>
                                        <div className="mt-1 text-zinc-600">
                                            {selectedType === "banner" && "728 × 90"}
                                            {selectedType === "square" && "300 × 300"}
                                            {selectedType === "sidebar" && "300 × 600"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
