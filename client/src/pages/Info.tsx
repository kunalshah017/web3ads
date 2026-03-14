import { useState } from "react";

export default function Info() {
    const [showProduction, setShowProduction] = useState(false);

    // Demo values (current contract)
    const demoRates = {
        banner: { cpm: 1000, perAd: 1.0 },
        square: { cpm: 1500, perAd: 1.5 },
        sidebar: { cpm: 2000, perAd: 2.0 },
        interstitial: { cpm: 4000, perAd: 4.0 },
    };

    // Production values (real-world)
    const productionRates = {
        banner: { cpm: 2, perAd: 0.002 },
        square: { cpm: 3, perAd: 0.003 },
        sidebar: { cpm: 4, perAd: 0.004 },
        interstitial: { cpm: 8, perAd: 0.008 },
    };

    const rates = showProduction ? productionRates : demoRates;

    const revenueSplit = {
        publisher: 50,
        viewer: 20,
        platform: 30,
    };

    // Calculate earnings for 5 ads
    const calcEarnings = (perAd: number, share: number, adCount: number = 5) =>
        ((perAd * share) / 100) * adCount;

    return (
        <div className="min-h-screen bg-black px-6 py-12">
            <div className="mx-auto max-w-5xl space-y-8">
                {/* Header */}
                <div className="border-4 border-white bg-black p-8 text-center">
                    <h1 className="font-mono text-4xl font-black uppercase tracking-tight text-white md:text-6xl">
                        PLATFORM
                        <br />
                        <span className="text-[#ff3e00]">INFO</span>
                    </h1>
                    <p className="mx-auto mt-4 max-w-xl font-mono text-xs uppercase leading-relaxed tracking-wider text-zinc-400">
                        A DECENTRALIZED AD PLATFORM WHERE ADVERTISERS, PUBLISHERS,
                        AND VIEWERS ALL BENEFIT FAIRLY.
                    </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex justify-center gap-2">
                    <button
                        onClick={() => setShowProduction(false)}
                        className={`border-4 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                            !showProduction
                                ? "border-[#ff3e00] bg-[#ff3e00] text-black"
                                : "border-zinc-700 bg-black text-zinc-400 hover:border-white hover:text-white"
                        }`}
                    >
                        DEMO VALUES
                    </button>
                    <button
                        onClick={() => setShowProduction(true)}
                        className={`border-4 px-6 py-3 font-mono text-xs font-bold uppercase tracking-wider transition-all ${
                            showProduction
                                ? "border-[#ff3e00] bg-[#ff3e00] text-black"
                                : "border-zinc-700 bg-black text-zinc-400 hover:border-white hover:text-white"
                        }`}
                    >
                        PRODUCTION
                    </button>
                </div>

                {/* Demo Banner */}
                {!showProduction && (
                    <div className="border-4 border-yellow-500 bg-yellow-500/10 p-4 text-center">
                        <p className="font-mono text-xs uppercase tracking-wider text-yellow-400">
                            <span className="font-black">DEMO MODE:</span> CPM RATES INFLATED 500X FOR HACKATHON.
                            VIEWER EARNS ~$1 AFTER 5 BANNER ADS!
                        </p>
                    </div>
                )}

                {/* Revenue Split */}
                <div className="border-4 border-zinc-700 bg-zinc-900 p-8">
                    <h2 className="mb-6 text-center font-mono text-2xl font-black uppercase text-white">
                        REVENUE DISTRIBUTION
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <div className="border-4 border-blue-500 bg-black p-6 text-center">
                            <div className="font-mono text-5xl font-black text-blue-400">
                                {revenueSplit.publisher}%
                            </div>
                            <div className="mt-2 font-mono text-sm font-bold uppercase text-white">
                                PUBLISHER
                            </div>
                            <p className="mt-2 font-mono text-xs uppercase text-zinc-500">
                                WEBSITE OWNERS HOSTING ADS
                            </p>
                        </div>
                        <div className="border-4 border-green-500 bg-black p-6 text-center">
                            <div className="font-mono text-5xl font-black text-green-400">
                                {revenueSplit.viewer}%
                            </div>
                            <div className="mt-2 font-mono text-sm font-bold uppercase text-white">
                                VIEWER
                            </div>
                            <p className="mt-2 font-mono text-xs uppercase text-zinc-500">
                                USERS WITH EXTENSION
                            </p>
                        </div>
                        <div className="border-4 border-[#ff3e00] bg-black p-6 text-center">
                            <div className="font-mono text-5xl font-black text-[#ff3e00]">
                                {revenueSplit.platform}%
                            </div>
                            <div className="mt-2 font-mono text-sm font-bold uppercase text-white">
                                PLATFORM
                            </div>
                            <p className="mt-2 font-mono text-xs uppercase text-zinc-500">
                                INFRASTRUCTURE & DEV
                            </p>
                        </div>
                    </div>
                </div>

                {/* CPM Rates Table */}
                <div className="border-4 border-zinc-700 bg-zinc-900 p-8">
                    <h2 className="mb-6 text-center font-mono text-2xl font-black uppercase text-white">
                        CPM RATES BY AD TYPE
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b-4 border-zinc-700">
                                    <th className="px-4 py-4 font-mono text-xs font-bold uppercase text-zinc-400">
                                        AD TYPE
                                    </th>
                                    <th className="px-4 py-4 font-mono text-xs font-bold uppercase text-zinc-400">
                                        CPM (PER 1000)
                                    </th>
                                    <th className="px-4 py-4 font-mono text-xs font-bold uppercase text-zinc-400">
                                        COST PER AD
                                    </th>
                                    <th className="px-4 py-4 font-mono text-xs font-bold uppercase text-zinc-400">
                                        ETH VALUE
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-zinc-800">
                                <tr className="transition-colors hover:bg-zinc-800">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-4 w-16 items-center justify-center border-2 border-[#ff3e00] font-mono text-[8px] text-[#ff3e00]">
                                                728×90
                                            </div>
                                            <span className="font-mono text-sm font-bold uppercase text-white">BANNER</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 font-mono text-lg font-black text-green-400">
                                        ${rates.banner.cpm.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 font-mono text-lg font-bold text-white">
                                        ${rates.banner.perAd.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-4 font-mono text-sm text-zinc-400">
                                        {(rates.banner.cpm / 2000).toFixed(4)} ETH
                                    </td>
                                </tr>
                                <tr className="transition-colors hover:bg-zinc-800">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 items-center justify-center border-2 border-[#ff3e00] font-mono text-[8px] text-[#ff3e00]">
                                                300²
                                            </div>
                                            <span className="font-mono text-sm font-bold uppercase text-white">SQUARE</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 font-mono text-lg font-black text-green-400">
                                        ${rates.square.cpm.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 font-mono text-lg font-bold text-white">
                                        ${rates.square.perAd.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-4 font-mono text-sm text-zinc-400">
                                        {(rates.square.cpm / 2000).toFixed(4)} ETH
                                    </td>
                                </tr>
                                <tr className="transition-colors hover:bg-zinc-800">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-12 w-6 items-center justify-center border-2 border-[#ff3e00] font-mono text-[6px] text-[#ff3e00]">
                                                300×600
                                            </div>
                                            <span className="font-mono text-sm font-bold uppercase text-white">SIDEBAR</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 font-mono text-lg font-black text-green-400">
                                        ${rates.sidebar.cpm.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 font-mono text-lg font-bold text-white">
                                        ${rates.sidebar.perAd.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-4 font-mono text-sm text-zinc-400">
                                        {(rates.sidebar.cpm / 2000).toFixed(4)} ETH
                                    </td>
                                </tr>
                                <tr className="transition-colors hover:bg-zinc-800">
                                    <td className="px-4 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-12 items-center justify-center border-2 border-[#ff3e00] font-mono text-[8px] text-[#ff3e00]">
                                                FULL
                                            </div>
                                            <span className="font-mono text-sm font-bold uppercase text-white">INTERSTITIAL</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 font-mono text-lg font-black text-green-400">
                                        ${rates.interstitial.cpm.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-4 font-mono text-lg font-bold text-white">
                                        ${rates.interstitial.perAd.toFixed(2)}
                                    </td>
                                    <td className="px-4 py-4 font-mono text-sm text-zinc-400">
                                        {(rates.interstitial.cpm / 2000).toFixed(4)} ETH
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Earnings Calculator */}
                <div className="border-4 border-zinc-700 bg-zinc-900 p-8">
                    <h2 className="mb-6 text-center font-mono text-2xl font-black uppercase text-white">
                        EARNINGS AFTER 5 BANNER ADS
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <div className="border-4 border-red-500/50 bg-black p-6">
                            <div className="font-mono text-xs uppercase text-zinc-500">ADVERTISER SPENT</div>
                            <div className="mt-2 font-mono text-2xl font-black text-red-400">
                                ${(rates.banner.perAd * 5).toFixed(2)}
                            </div>
                            <div className="mt-1 font-mono text-xs text-zinc-600">
                                {((rates.banner.perAd * 5) / 2000).toFixed(6)} ETH
                            </div>
                        </div>
                        <div className="border-4 border-blue-500/50 bg-black p-6">
                            <div className="font-mono text-xs uppercase text-zinc-500">PUBLISHER EARNS</div>
                            <div className="mt-2 font-mono text-2xl font-black text-blue-400">
                                ${calcEarnings(rates.banner.perAd, revenueSplit.publisher).toFixed(2)}
                            </div>
                            <div className="mt-1 font-mono text-xs text-zinc-600">50% OF SPEND</div>
                        </div>
                        <div className="border-4 border-green-500/50 bg-black p-6">
                            <div className="font-mono text-xs uppercase text-zinc-500">VIEWER EARNS</div>
                            <div className="mt-2 font-mono text-2xl font-black text-green-400">
                                ${calcEarnings(rates.banner.perAd, revenueSplit.viewer).toFixed(2)}
                            </div>
                            <div className="mt-1 font-mono text-xs text-zinc-600">20% OF SPEND</div>
                        </div>
                        <div className="border-4 border-[#ff3e00]/50 bg-black p-6">
                            <div className="font-mono text-xs uppercase text-zinc-500">PLATFORM EARNS</div>
                            <div className="mt-2 font-mono text-2xl font-black text-[#ff3e00]">
                                ${calcEarnings(rates.banner.perAd, revenueSplit.platform).toFixed(2)}
                            </div>
                            <div className="mt-1 font-mono text-xs text-zinc-600">30% OF SPEND</div>
                        </div>
                    </div>
                </div>

                {/* Comparison Table */}
                <div className="border-4 border-zinc-700 bg-zinc-900 p-8">
                    <h2 className="mb-6 text-center font-mono text-2xl font-black uppercase text-white">
                        DEMO VS PRODUCTION
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b-4 border-zinc-700">
                                    <th className="px-4 py-4 font-mono text-xs font-bold uppercase text-zinc-400">
                                        METRIC
                                    </th>
                                    <th className="px-4 py-4 font-mono text-xs font-bold uppercase text-yellow-400">
                                        DEMO (HACKATHON)
                                    </th>
                                    <th className="px-4 py-4 font-mono text-xs font-bold uppercase text-green-400">
                                        PRODUCTION (REAL)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-zinc-800">
                                <tr className="transition-colors hover:bg-zinc-800">
                                    <td className="px-4 py-4 font-mono text-sm uppercase text-white">Banner CPM</td>
                                    <td className="px-4 py-4 font-mono font-bold text-yellow-400">$1,000</td>
                                    <td className="px-4 py-4 font-mono font-bold text-green-400">$2</td>
                                </tr>
                                <tr className="transition-colors hover:bg-zinc-800">
                                    <td className="px-4 py-4 font-mono text-sm uppercase text-white">Cost Per Ad</td>
                                    <td className="px-4 py-4 font-mono font-bold text-yellow-400">$1.00</td>
                                    <td className="px-4 py-4 font-mono font-bold text-green-400">$0.002</td>
                                </tr>
                                <tr className="transition-colors hover:bg-zinc-800">
                                    <td className="px-4 py-4 font-mono text-sm uppercase text-white">Viewer: 5 Ads</td>
                                    <td className="px-4 py-4 font-mono font-bold text-yellow-400">$1.00</td>
                                    <td className="px-4 py-4 font-mono font-bold text-green-400">$0.002</td>
                                </tr>
                                <tr className="transition-colors hover:bg-zinc-800">
                                    <td className="px-4 py-4 font-mono text-sm uppercase text-white">Viewer: $1 Target</td>
                                    <td className="px-4 py-4 font-mono font-bold text-yellow-400">5 ADS</td>
                                    <td className="px-4 py-4 font-mono font-bold text-green-400">2,500 ADS</td>
                                </tr>
                                <tr className="transition-colors hover:bg-zinc-800">
                                    <td className="px-4 py-4 font-mono text-sm uppercase text-white">Min Withdrawal</td>
                                    <td className="px-4 py-4 font-mono font-bold text-yellow-400">1 WEI (≈$0)</td>
                                    <td className="px-4 py-4 font-mono font-bold text-green-400">0.0001 ETH</td>
                                </tr>
                                <tr className="transition-colors hover:bg-zinc-800">
                                    <td className="px-4 py-4 font-mono text-sm uppercase text-white">Multiplier</td>
                                    <td className="px-4 py-4 font-mono font-bold text-yellow-400">500X</td>
                                    <td className="px-4 py-4 font-mono font-bold text-green-400">1X</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Technical Details */}
                <div className="border-4 border-zinc-700 bg-zinc-900 p-8">
                    <h2 className="mb-6 text-center font-mono text-2xl font-black uppercase text-white">
                        TECHNICAL SPECS
                    </h2>
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                        <div className="space-y-4">
                            <h3 className="font-mono text-lg font-bold uppercase text-[#ff3e00]">
                                BLOCKCHAIN
                            </h3>
                            <ul className="space-y-2">
                                <li className="flex items-center gap-3 font-mono text-sm text-zinc-300">
                                    <span className="h-2 w-2 bg-[#ff3e00]"></span>
                                    CHAIN: BASE SEPOLIA (TESTNET)
                                </li>
                                <li className="flex items-center gap-3 font-mono text-sm text-zinc-300">
                                    <span className="h-2 w-2 bg-[#ff3e00]"></span>
                                    TOKEN: NATIVE ETH
                                </li>
                                <li className="flex items-center gap-3 font-mono text-sm text-zinc-300">
                                    <span className="h-2 w-2 bg-[#ff3e00]"></span>
                                    GASLESS: EIP-2771 FORWARDER
                                </li>
                                <li className="flex items-center gap-3 font-mono text-sm text-zinc-300">
                                    <span className="h-2 w-2 bg-[#ff3e00]"></span>
                                    CONTRACT: WEB3ADSCOREV2
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h3 className="font-mono text-lg font-bold uppercase text-[#ff3e00]">
                                PRIVACY
                            </h3>
                            <ul className="space-y-2">
                                <li className="flex items-center gap-3 font-mono text-sm text-zinc-300">
                                    <span className="h-2 w-2 bg-[#ff3e00]"></span>
                                    SEMAPHORE COMMITMENTS
                                </li>
                                <li className="flex items-center gap-3 font-mono text-sm text-zinc-300">
                                    <span className="h-2 w-2 bg-[#ff3e00]"></span>
                                    ANONYMOUS ON-CHAIN IDENTITY
                                </li>
                                <li className="flex items-center gap-3 font-mono text-sm text-zinc-300">
                                    <span className="h-2 w-2 bg-[#ff3e00]"></span>
                                    NULLIFIER REPLAY PROTECTION
                                </li>
                                <li className="flex items-center gap-3 font-mono text-sm text-zinc-300">
                                    <span className="h-2 w-2 bg-[#ff3e00]"></span>
                                    BACKEND SIGNATURE VERIFICATION
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t-4 border-zinc-700 pt-8 text-center">
                    <p className="font-mono text-xs uppercase tracking-wider text-zinc-600">
                        BUILT FOR WEB3 HACKATHON • MARCH 2026
                    </p>
                    <p className="mt-2 font-mono text-xs uppercase tracking-wider text-zinc-700">
                        SOLIDITY • REACT • VITE • EXPRESS • PRISMA
                    </p>
                </div>
            </div>
        </div>
    );
}
