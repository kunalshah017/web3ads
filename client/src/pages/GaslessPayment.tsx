import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { isAddress } from "viem";
import { WalletButton } from "../components/WalletButton";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

interface BalanceData {
    publisher: { pending: number; claimed: number; total: number } | null;
    viewer: { pending: number; claimed: number; total: number } | null;
    total: { pending: number; claimed: number; total: number };
    canWithdraw: boolean;
}

export function GaslessPaymentPage() {
    const { address, isConnected } = useAccount();
    const [balance, setBalance] = useState<BalanceData | null>(null);
    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingBalance, setIsFetchingBalance] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Fetch balance when wallet connects
    useEffect(() => {
        if (address) {
            fetchBalance();
        }
    }, [address]);

    const fetchBalance = async () => {
        if (!address) return;
        setIsFetchingBalance(true);
        try {
            const response = await fetch(
                `${API_URL}/api/rewards/balance?walletAddress=${address}`
            );
            const data = await response.json();
            setBalance(data);
        } catch (err) {
            console.error("Failed to fetch balance:", err);
        } finally {
            setIsFetchingBalance(false);
        }
    };

    const handleSend = async () => {
        setError(null);
        setSuccess(false);
        setTxHash(null);

        // Validation
        if (!address) {
            setError("Please connect your wallet first");
            return;
        }

        if (!recipient || !isAddress(recipient)) {
            setError("Please enter a valid recipient address");
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }

        const amountNum = parseFloat(amount);
        const availableBalance = balance?.total.pending || 0;

        if (amountNum > availableBalance) {
            setError(
                `Insufficient balance. You have ${availableBalance.toFixed(6)} ETH available.`
            );
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/rewards/gasless-pay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    walletAddress: address,
                    recipient: recipient,
                    amount: amountNum,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Transaction failed");
            }

            setTxHash(data.txHash);
            setSuccess(true);
            setAmount("");
            setRecipient("");

            // Refresh balance
            await fetchBalance();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Transaction failed");
        } finally {
            setIsLoading(false);
        }
    };

    const setMaxAmount = () => {
        if (balance?.total.pending) {
            setAmount(balance.total.pending.toString());
        }
    };

    // Convert ETH to USD (approximate)
    const ethToUsd = (eth: number) => (eth * 2000).toFixed(2);

    return (
        <div className="min-h-screen bg-black py-12 px-4">
            <div className="max-w-2xl mx-auto space-y-8">
                {/* Header */}
                <div className="border-4 border-white bg-black p-8 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 border-2 border-green-500 mb-4">
                        <span className="w-2 h-2 bg-green-500 animate-pulse"></span>
                        <span className="text-green-400 text-xs font-mono uppercase tracking-wider">
                            GASLESS ENABLED
                        </span>
                    </div>
                    <h1 className="font-mono text-4xl font-black uppercase tracking-tight text-white md:text-5xl">
                        GASLESS
                        <br />
                        <span className="text-[#ff3e00]">PAYMENTS</span>
                    </h1>
                    <p className="text-zinc-400 max-w-md mx-auto mt-4 font-mono text-xs uppercase tracking-wider">
                        Send your ad earnings to anyone without paying gas fees. We sponsor
                        all transaction costs on Base.
                    </p>
                </div>

                {!isConnected ? (
                    /* Connect Wallet Prompt */
                    <div className="bg-zinc-900 border-4 border-zinc-800 p-8 text-center space-y-4">
                        <p className="text-zinc-400 font-mono uppercase text-sm">
                            Connect your wallet to use gasless payments
                        </p>
                        <WalletButton />
                    </div>
                ) : (
                    <>
                        {/* Balance Card */}
                        <div className="bg-zinc-900 border-4 border-zinc-800 p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-500 font-mono text-sm">
                                    YOUR AD EARNINGS BALANCE
                                </span>
                                <button
                                    onClick={fetchBalance}
                                    disabled={isFetchingBalance}
                                    className="text-zinc-500 hover:text-white text-sm font-mono"
                                >
                                    {isFetchingBalance ? "..." : "↻ REFRESH"}
                                </button>
                            </div>

                            <div className="flex items-end gap-4">
                                <div>
                                    <span className="text-5xl font-black text-white">
                                        {balance?.total.pending.toFixed(6) || "0.000000"}
                                    </span>
                                    <span className="text-2xl text-zinc-500 ml-2">ETH</span>
                                </div>
                                <span className="text-zinc-500 font-mono pb-2">
                                    ≈ ${ethToUsd(balance?.total.pending || 0)} USD
                                </span>
                            </div>

                            {balance && (
                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-zinc-800">
                                    <div>
                                        <p className="text-zinc-500 text-xs font-mono">
                                            FROM PUBLISHING
                                        </p>
                                        <p className="text-white font-mono">
                                            {balance.publisher?.pending.toFixed(6) || "0.000000"} ETH
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-zinc-500 text-xs font-mono">
                                            FROM VIEWING
                                        </p>
                                        <p className="text-white font-mono">
                                            {balance.viewer?.pending.toFixed(6) || "0.000000"} ETH
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Payment Form */}
                        <div className="bg-zinc-900 border-4 border-zinc-800 p-6 space-y-6">
                            <h2 className="text-xl font-bold text-white">SEND PAYMENT</h2>

                            {/* Recipient */}
                            <div className="space-y-2">
                                <label className="text-zinc-500 font-mono text-sm">
                                    RECIPIENT ADDRESS
                                </label>
                                <input
                                    type="text"
                                    value={recipient}
                                    onChange={(e) => setRecipient(e.target.value)}
                                    placeholder="0x..."
                                    className="w-full bg-black border-4 border-zinc-700 px-4 py-3 text-white font-mono placeholder:text-zinc-600 focus:border-[#ff3e00] focus:outline-none"
                                />
                            </div>

                            {/* Amount */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-zinc-500 font-mono text-sm">
                                        AMOUNT (ETH)
                                    </label>
                                    <button
                                        onClick={setMaxAmount}
                                        className="text-[#ff3e00] font-mono text-sm hover:underline"
                                    >
                                        MAX
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.0"
                                        step="0.000001"
                                        min="0"
                                        className="w-full bg-black border-4 border-zinc-700 px-4 py-3 text-white font-mono placeholder:text-zinc-600 focus:border-[#ff3e00] focus:outline-none"
                                    />
                                    {amount && (
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 font-mono">
                                            ≈ ${ethToUsd(parseFloat(amount) || 0)}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Gas Info */}
                            <div className="bg-green-500/10 border border-green-500/30 rounded px-4 py-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400">⛽</span>
                                    <span className="text-green-400 text-sm">
                                        Gas fee: <strong>$0.00</strong> — Sponsored by Web3Ads
                                    </span>
                                </div>
                            </div>

                            {/* Error Message */}
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/30 rounded px-4 py-3">
                                    <p className="text-red-400 text-sm font-mono">{error}</p>
                                </div>
                            )}

                            {/* Success Message */}
                            {success && txHash && (
                                <div className="bg-green-500/10 border border-green-500/30 rounded px-4 py-3 space-y-2">
                                    <p className="text-green-400 font-mono">
                                        ✓ Transaction successful!
                                    </p>
                                    <a
                                        href={`https://sepolia.basescan.org/tx/${txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#ff3e00] text-sm font-mono hover:underline block"
                                    >
                                        View on BaseScan →
                                    </a>
                                </div>
                            )}

                            {/* Send Button */}
                            <button
                                onClick={handleSend}
                                disabled={isLoading || !recipient || !amount}
                                className={`w-full py-4 font-mono font-bold text-lg uppercase tracking-wider transition-all ${isLoading || !recipient || !amount
                                    ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                    : "bg-[#ff3e00] text-white hover:bg-[#ff5500] active:scale-[0.98]"
                                    }`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        PROCESSING...
                                    </span>
                                ) : (
                                    "SEND GASLESS PAYMENT"
                                )}
                            </button>
                        </div>

                        {/* How It Works */}
                        <div className="bg-zinc-900 border-4 border-zinc-800 p-6 space-y-4">
                            <h2 className="text-lg font-bold text-white">HOW IT WORKS</h2>
                            <div className="space-y-3">
                                <div className="flex gap-4">
                                    <span className="flex-shrink-0 w-8 h-8 bg-[#ff3e00] text-white font-bold flex items-center justify-center">
                                        1
                                    </span>
                                    <div>
                                        <p className="text-white font-medium">
                                            Earn from viewing ads
                                        </p>
                                        <p className="text-zinc-500 text-sm">
                                            View ads with the Web3Ads extension installed
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <span className="flex-shrink-0 w-8 h-8 bg-[#ff3e00] text-white font-bold flex items-center justify-center">
                                        2
                                    </span>
                                    <div>
                                        <p className="text-white font-medium">Enter recipient</p>
                                        <p className="text-zinc-500 text-sm">
                                            Paste any wallet address or ENS name
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <span className="flex-shrink-0 w-8 h-8 bg-[#ff3e00] text-white font-bold flex items-center justify-center">
                                        3
                                    </span>
                                    <div>
                                        <p className="text-white font-medium">
                                            We pay the gas, you send free
                                        </p>
                                        <p className="text-zinc-500 text-sm">
                                            Your ETH goes directly to recipient, gas sponsored by us
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Transactions Placeholder */}
                        <div className="bg-zinc-900 border-4 border-zinc-800 p-6 space-y-4">
                            <h2 className="text-lg font-bold text-white">
                                RECENT TRANSACTIONS
                            </h2>
                            <p className="text-zinc-500 text-sm font-mono">
                                No gasless transactions yet. Send your first payment above!
                            </p>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default GaslessPaymentPage;
