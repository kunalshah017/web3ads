import { ConnectButton } from "@rainbow-me/rainbowkit";

export function WalletButton() {
    return (
        <ConnectButton.Custom>
            {({
                account,
                chain,
                openAccountModal,
                openChainModal,
                openConnectModal,
                mounted,
            }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                    <div
                        {...(!ready && {
                            "aria-hidden": true,
                            style: {
                                opacity: 0,
                                pointerEvents: "none",
                                userSelect: "none",
                            },
                        })}
                    >
                        {(() => {
                            if (!connected) {
                                return (
                                    <button
                                        onClick={openConnectModal}
                                        type="button"
                                        className="border-4 border-white bg-black px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-white hover:text-black active:translate-y-0.5"
                                    >
                                        CONNECT WALLET
                                    </button>
                                );
                            }

                            if (chain.unsupported) {
                                return (
                                    <button
                                        onClick={openChainModal}
                                        type="button"
                                        className="border-4 border-red-500 bg-red-500 px-6 py-3 font-mono text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-red-600"
                                    >
                                        WRONG NETWORK
                                    </button>
                                );
                            }

                            return (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={openChainModal}
                                        type="button"
                                        className="border-4 border-zinc-700 bg-zinc-900 px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-zinc-300 transition-all hover:border-white hover:text-white"
                                    >
                                        {chain.name}
                                    </button>
                                    <button
                                        onClick={openAccountModal}
                                        type="button"
                                        className="border-4 border-[#ff3e00] bg-black px-4 py-3 font-mono text-xs font-bold uppercase tracking-wider text-white transition-all hover:bg-[#ff3e00]"
                                    >
                                        {account.displayName}
                                        {account.displayBalance && !account.displayBalance.includes("NaN") && ` | ${account.displayBalance}`}
                                    </button>
                                </div>
                            );
                        })()}
                    </div>
                );
            }}
        </ConnectButton.Custom>
    );
}
