import { useState } from "react";
import { Web3Ad, setApiUrl } from "web3ads-react";

// Set API URL for local development
setApiUrl(import.meta.env.VITE_API_URL || "http://localhost:3001");

export function TestPage() {
    const [publisherWallet, setPublisherWallet] = useState("0x1234567890abcdef1234567890abcdef12345678");
    const [adType, setAdType] = useState<"banner" | "square" | "sidebar">("banner");
    const [testMode, setTestMode] = useState(true);
    const [impressions, setImpressions] = useState<string[]>([]);

    const handleImpression = (adId: string) => {
        setImpressions((prev) => [...prev, `${new Date().toLocaleTimeString()} - ${adId}`]);
    };

    return (
        <div className="px-6 py-8">
            <div className="mx-auto max-w-5xl">
                {/* Header */}
                <div className="mb-8 border-b-4 border-zinc-800 pb-4">
                    <h1 className="font-mono text-3xl font-black uppercase">SDK TEST PAGE</h1>
                    <p className="mt-2 font-mono text-xs uppercase text-zinc-500">
                        TEST THE WEB3ADS-REACT COMPONENT
                    </p>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    {/* Controls */}
                    <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
                        <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
                            CONFIGURATION
                        </h2>

                        <div className="mt-6 space-y-4">
                            {/* Publisher Wallet */}
                            <div>
                                <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                                    PUBLISHER WALLET
                                </label>
                                <input
                                    type="text"
                                    value={publisherWallet}
                                    onChange={(e) => setPublisherWallet(e.target.value)}
                                    className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#ff3e00] focus:outline-none"
                                    placeholder="0x..."
                                />
                            </div>

                            {/* Ad Type */}
                            <div>
                                <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                                    AD TYPE
                                </label>
                                <select
                                    value={adType}
                                    onChange={(e) => setAdType(e.target.value as "banner" | "square" | "sidebar")}
                                    className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white focus:border-[#ff3e00] focus:outline-none"
                                >
                                    <option value="banner">BANNER (728x90)</option>
                                    <option value="square">SQUARE (300x300)</option>
                                    <option value="sidebar">SIDEBAR (300x600)</option>
                                </select>
                            </div>

                            {/* Test Mode Toggle */}
                            <div className="flex items-center justify-between border-t-2 border-zinc-700 pt-4">
                                <span className="font-mono text-xs font-bold uppercase text-zinc-400">
                                    TEST MODE (PLACEHOLDER ADS)
                                </span>
                                <button
                                    onClick={() => setTestMode(!testMode)}
                                    className={`border-4 px-4 py-2 font-mono text-xs font-bold uppercase transition-all ${testMode
                                        ? "border-green-500 bg-green-500 text-black"
                                        : "border-zinc-700 bg-black text-zinc-400"
                                        }`}
                                >
                                    {testMode ? "ON" : "OFF"}
                                </button>
                            </div>
                        </div>

                        {/* Impressions Log */}
                        <div className="mt-6 border-t-2 border-zinc-700 pt-4">
                            <h3 className="font-mono text-xs font-bold uppercase text-zinc-400">
                                IMPRESSION LOG
                            </h3>
                            <div className="mt-2 h-32 overflow-y-auto border-2 border-zinc-800 bg-black p-2">
                                {impressions.length === 0 ? (
                                    <p className="font-mono text-xs text-zinc-600">
                                        No impressions recorded yet...
                                    </p>
                                ) : (
                                    impressions.map((imp, i) => (
                                        <p key={i} className="font-mono text-xs text-green-500">
                                            ✓ {imp}
                                        </p>
                                    ))
                                )}
                            </div>
                            {impressions.length > 0 && (
                                <button
                                    onClick={() => setImpressions([])}
                                    className="mt-2 font-mono text-xs uppercase text-zinc-500 hover:text-white"
                                >
                                    CLEAR LOG
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Ad Preview */}
                    <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
                        <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
                            LIVE PREVIEW
                        </h2>

                        <div className="mt-6 flex flex-col items-center justify-center">
                            <div className="mb-4 w-full border-2 border-dashed border-zinc-700 p-4">
                                <Web3Ad
                                    publisherWallet={publisherWallet as `0x${string}`}
                                    type={adType}
                                    category="test"
                                    testMode={testMode}
                                    onImpression={handleImpression}
                                    onError={(err: Error) => console.error("Ad error:", err)}
                                />
                            </div>

                            <div className="w-full space-y-2 border-t-2 border-zinc-700 pt-4">
                                <div className="flex justify-between font-mono text-xs uppercase">
                                    <span className="text-zinc-500">TYPE</span>
                                    <span className="text-white">{adType.toUpperCase()}</span>
                                </div>
                                <div className="flex justify-between font-mono text-xs uppercase">
                                    <span className="text-zinc-500">MODE</span>
                                    <span className={testMode ? "text-yellow-500" : "text-green-500"}>
                                        {testMode ? "TEST" : "LIVE"}
                                    </span>
                                </div>
                                <div className="flex justify-between font-mono text-xs uppercase">
                                    <span className="text-zinc-500">IMPRESSIONS</span>
                                    <span className="text-white">{impressions.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Usage Example */}
                <div className="mt-8 border-4 border-zinc-700 bg-zinc-900 p-6">
                    <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
                        USAGE CODE
                    </h2>
                    <pre className="mt-4 overflow-x-auto border-4 border-zinc-800 bg-black p-4 font-mono text-xs text-zinc-300">
                        {`import { Web3Ad } from 'web3ads-react';

<Web3Ad
  publisherWallet="${publisherWallet}"
  type="${adType}"
  category="defi"
  onImpression={(adId) => console.log('Impression:', adId)}
/>`}
                    </pre>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(
                                `import { Web3Ad } from 'web3ads-react';\n\n<Web3Ad\n  publisherWallet="${publisherWallet}"\n  type="${adType}"\n  category="defi"\n  onImpression={(adId) => console.log('Impression:', adId)}\n/>`
                            );
                        }}
                        className="mt-4 w-full border-4 border-white bg-black py-3 font-mono text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-black"
                    >
                        COPY CODE
                    </button>
                </div>
            </div>
        </div>
    );
}
