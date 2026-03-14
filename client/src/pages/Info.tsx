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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900 py-12 px-4">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header */}
                <div className="text-center space-y-4">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        Web3Ads Platform Info
                    </h1>
                    <p className="text-gray-400 max-w-2xl mx-auto">
                        A decentralized advertising platform where advertisers, publishers,
                        and viewers all benefit fairly from the advertising ecosystem.
                    </p>
                </div>

                {/* Mode Toggle */}
                <div className="flex justify-center">
                    <div className="bg-gray-800/50 rounded-xl p-1 inline-flex">
                        <button
                            onClick={() => setShowProduction(false)}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${!showProduction
                                    ? "bg-purple-600 text-white"
                                    : "text-gray-400 hover:text-white"
                                }`}
                        >
                            Demo Values
                        </button>
                        <button
                            onClick={() => setShowProduction(true)}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${showProduction
                                    ? "bg-purple-600 text-white"
                                    : "text-gray-400 hover:text-white"
                                }`}
                        >
                            Production Values
                        </button>
                    </div>
                </div>

                {/* Info Banner */}
                {!showProduction && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                        <p className="text-yellow-400 text-sm">
                            <span className="font-bold">Demo Mode:</span> CPM rates are
                            inflated 500x for hackathon demonstration. Viewer earns ~$1 after
                            5 banner ads!
                        </p>
                    </div>
                )}

                {/* Revenue Split */}
                <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700/50">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">
                        Revenue Distribution
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl p-6 text-center border border-blue-500/30">
                            <div className="text-5xl font-bold text-blue-400 mb-2">
                                {revenueSplit.publisher}%
                            </div>
                            <div className="text-gray-300 font-medium">Publisher</div>
                            <p className="text-gray-500 text-sm mt-2">
                                Website owners hosting ads
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-xl p-6 text-center border border-green-500/30">
                            <div className="text-5xl font-bold text-green-400 mb-2">
                                {revenueSplit.viewer}%
                            </div>
                            <div className="text-gray-300 font-medium">Viewer</div>
                            <p className="text-gray-500 text-sm mt-2">
                                Users viewing ads with extension
                            </p>
                        </div>
                        <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl p-6 text-center border border-purple-500/30">
                            <div className="text-5xl font-bold text-purple-400 mb-2">
                                {revenueSplit.platform}%
                            </div>
                            <div className="text-gray-300 font-medium">Platform</div>
                            <p className="text-gray-500 text-sm mt-2">
                                Infrastructure & development
                            </p>
                        </div>
                    </div>
                </div>

                {/* CPM Rates Table */}
                <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700/50">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">
                        CPM Rates by Ad Type
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="py-4 px-4 text-gray-400 font-medium">
                                        Ad Type
                                    </th>
                                    <th className="py-4 px-4 text-gray-400 font-medium">
                                        CPM (per 1000 views)
                                    </th>
                                    <th className="py-4 px-4 text-gray-400 font-medium">
                                        Cost Per Ad
                                    </th>
                                    <th className="py-4 px-4 text-gray-400 font-medium">
                                        ETH Value
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                <tr className="hover:bg-gray-700/20">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-16 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded text-[8px] flex items-center justify-center text-white">
                                                728×90
                                            </div>
                                            <span className="text-white font-medium">Banner</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-green-400 font-mono">
                                        ${rates.banner.cpm.toLocaleString()}
                                    </td>
                                    <td className="py-4 px-4 text-white font-mono">
                                        ${rates.banner.perAd.toFixed(2)}
                                    </td>
                                    <td className="py-4 px-4 text-gray-400 font-mono text-sm">
                                        {(rates.banner.cpm / 2000).toFixed(4)} ETH
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-700/20">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded text-[8px] flex items-center justify-center text-white">
                                                300²
                                            </div>
                                            <span className="text-white font-medium">Square</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-green-400 font-mono">
                                        ${rates.square.cpm.toLocaleString()}
                                    </td>
                                    <td className="py-4 px-4 text-white font-mono">
                                        ${rates.square.perAd.toFixed(2)}
                                    </td>
                                    <td className="py-4 px-4 text-gray-400 font-mono text-sm">
                                        {(rates.square.cpm / 2000).toFixed(4)} ETH
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-700/20">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded text-[6px] flex items-center justify-center text-white">
                                                300×600
                                            </div>
                                            <span className="text-white font-medium">Sidebar</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-green-400 font-mono">
                                        ${rates.sidebar.cpm.toLocaleString()}
                                    </td>
                                    <td className="py-4 px-4 text-white font-mono">
                                        ${rates.sidebar.perAd.toFixed(2)}
                                    </td>
                                    <td className="py-4 px-4 text-gray-400 font-mono text-sm">
                                        {(rates.sidebar.cpm / 2000).toFixed(4)} ETH
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-700/20">
                                    <td className="py-4 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded text-[8px] flex items-center justify-center text-white">
                                                Full
                                            </div>
                                            <span className="text-white font-medium">
                                                Interstitial
                                            </span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-4 text-green-400 font-mono">
                                        ${rates.interstitial.cpm.toLocaleString()}
                                    </td>
                                    <td className="py-4 px-4 text-white font-mono">
                                        ${rates.interstitial.perAd.toFixed(2)}
                                    </td>
                                    <td className="py-4 px-4 text-gray-400 font-mono text-sm">
                                        {(rates.interstitial.cpm / 2000).toFixed(4)} ETH
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Earnings Calculator */}
                <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700/50">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">
                        Earnings After 5 Banner Ads
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50">
                            <div className="text-gray-400 text-sm mb-2">Advertiser Spent</div>
                            <div className="text-2xl font-bold text-red-400 font-mono">
                                ${(rates.banner.perAd * 5).toFixed(2)}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                                {((rates.banner.perAd * 5) / 2000).toFixed(6)} ETH
                            </div>
                        </div>
                        <div className="bg-gray-900/50 rounded-xl p-6 border border-blue-500/30">
                            <div className="text-gray-400 text-sm mb-2">Publisher Earns</div>
                            <div className="text-2xl font-bold text-blue-400 font-mono">
                                ${calcEarnings(rates.banner.perAd, revenueSplit.publisher).toFixed(2)}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                                50% of ad spend
                            </div>
                        </div>
                        <div className="bg-gray-900/50 rounded-xl p-6 border border-green-500/30">
                            <div className="text-gray-400 text-sm mb-2">Viewer Earns</div>
                            <div className="text-2xl font-bold text-green-400 font-mono">
                                ${calcEarnings(rates.banner.perAd, revenueSplit.viewer).toFixed(2)}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                                20% of ad spend
                            </div>
                        </div>
                        <div className="bg-gray-900/50 rounded-xl p-6 border border-purple-500/30">
                            <div className="text-gray-400 text-sm mb-2">Platform Earns</div>
                            <div className="text-2xl font-bold text-purple-400 font-mono">
                                ${calcEarnings(rates.banner.perAd, revenueSplit.platform).toFixed(2)}
                            </div>
                            <div className="text-gray-500 text-xs mt-1">
                                30% of ad spend
                            </div>
                        </div>
                    </div>
                </div>

                {/* Comparison Table */}
                <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700/50">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">
                        Demo vs Production Comparison
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className="py-4 px-4 text-gray-400 font-medium">
                                        Metric
                                    </th>
                                    <th className="py-4 px-4 text-yellow-400 font-medium">
                                        Demo (Hackathon)
                                    </th>
                                    <th className="py-4 px-4 text-green-400 font-medium">
                                        Production (Real)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                <tr className="hover:bg-gray-700/20">
                                    <td className="py-4 px-4 text-white">Banner CPM</td>
                                    <td className="py-4 px-4 text-yellow-400 font-mono">
                                        $1,000
                                    </td>
                                    <td className="py-4 px-4 text-green-400 font-mono">$2</td>
                                </tr>
                                <tr className="hover:bg-gray-700/20">
                                    <td className="py-4 px-4 text-white">Cost Per Ad</td>
                                    <td className="py-4 px-4 text-yellow-400 font-mono">$1.00</td>
                                    <td className="py-4 px-4 text-green-400 font-mono">$0.002</td>
                                </tr>
                                <tr className="hover:bg-gray-700/20">
                                    <td className="py-4 px-4 text-white">Viewer: 5 Ads</td>
                                    <td className="py-4 px-4 text-yellow-400 font-mono">$1.00</td>
                                    <td className="py-4 px-4 text-green-400 font-mono">$0.002</td>
                                </tr>
                                <tr className="hover:bg-gray-700/20">
                                    <td className="py-4 px-4 text-white">Viewer: $1 Target</td>
                                    <td className="py-4 px-4 text-yellow-400 font-mono">
                                        5 ads
                                    </td>
                                    <td className="py-4 px-4 text-green-400 font-mono">
                                        2,500 ads
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-700/20">
                                    <td className="py-4 px-4 text-white">Min Withdrawal</td>
                                    <td className="py-4 px-4 text-yellow-400 font-mono">
                                        1 wei (≈$0)
                                    </td>
                                    <td className="py-4 px-4 text-green-400 font-mono">
                                        0.0001 ETH (≈$0.20)
                                    </td>
                                </tr>
                                <tr className="hover:bg-gray-700/20">
                                    <td className="py-4 px-4 text-white">Multiplier</td>
                                    <td className="py-4 px-4 text-yellow-400 font-mono">500x</td>
                                    <td className="py-4 px-4 text-green-400 font-mono">1x</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Technical Details */}
                <div className="bg-gray-800/30 rounded-2xl p-8 border border-gray-700/50">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">
                        Technical Specifications
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-purple-400">
                                Blockchain
                            </h3>
                            <ul className="space-y-2 text-gray-300">
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                    Chain: Base Sepolia (Testnet)
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                    Token: Native ETH
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                    Gasless: EIP-2771 Forwarder
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                    Contract: Web3AdsCoreV2
                                </li>
                            </ul>
                        </div>
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-pink-400">Privacy</h3>
                            <ul className="space-y-2 text-gray-300">
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                                    Semaphore Commitments
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                                    Anonymous On-Chain Identity
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                                    Nullifier-Based Replay Protection
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                                    Backend Signature Verification
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center text-gray-500 text-sm">
                    <p>Built for the Web3 Hackathon • March 2026</p>
                    <p className="mt-1">
                        Smart Contract: Solidity • Frontend: React + Vite • Backend:
                        Express + Prisma
                    </p>
                </div>
            </div>
        </div>
    );
}
