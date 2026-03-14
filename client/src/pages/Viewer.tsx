import { useAccount } from "wagmi";
import { WalletButton } from "../components/WalletButton";

export function ViewerPage() {
  const { isConnected } = useAccount();

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Hero */}
        <div className="border-4 border-white bg-black p-12 text-center">
          <h1 className="font-mono text-4xl font-black uppercase md:text-5xl">
            EARN BY VIEWING ADS
          </h1>
          <p className="mt-4 font-mono text-sm uppercase tracking-wider text-zinc-400">
            INSTALL OUR EXTENSION. GET 20% OF AD REVENUE.
          </p>
        </div>

        {/* Extension Card */}
        <div className="mt-8 border-4 border-[#ff3e00] bg-zinc-900 p-8">
          <div className="text-center">
            <div className="text-6xl">🧩</div>
            <h2 className="mt-4 font-mono text-2xl font-black uppercase">WEB3ADS EXTENSION</h2>
            <p className="mx-auto mt-4 max-w-lg font-mono text-xs uppercase leading-relaxed text-zinc-400">
              OUR BROWSER EXTENSION USES ZERO-KNOWLEDGE PROOFS TO VERIFY YOUR AD VIEWS WITHOUT
              TRACKING YOUR IDENTITY.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-3 gap-4">
            {[
              { icon: "🔒", label: "PRIVACY-FIRST" },
              { icon: "⚡", label: "AUTOMATIC" },
              { icon: "💰", label: "EARN USDC" },
            ].map((feature) => (
              <div key={feature.label} className="border-2 border-zinc-700 bg-black p-4 text-center">
                <span className="text-2xl">{feature.icon}</span>
                <span className="mt-2 block font-mono text-xs font-bold uppercase">{feature.label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => alert("Extension coming soon!")}
            className="mt-8 w-full border-4 border-white bg-white py-4 font-mono text-sm font-bold uppercase tracking-wider text-black transition-all hover:bg-[#ff3e00] hover:text-white"
          >
            INSTALL EXTENSION
          </button>
          <p className="mt-4 text-center font-mono text-xs uppercase text-zinc-600">
            CHROME • FIREFOX • BRAVE
          </p>
        </div>

        {/* How It Works */}
        <div className="mt-12">
          <h2 className="border-b-4 border-zinc-800 pb-4 font-mono text-2xl font-black uppercase">
            HOW IT WORKS
          </h2>
          <div className="mt-8 space-y-6">
            {[
              {
                num: "1",
                title: "INSTALL EXTENSION",
                desc: "One-click install. The extension generates a private zkProof identity that's stored only on your device.",
              },
              {
                num: "2",
                title: "BROWSE NORMALLY",
                desc: "Visit any site with Web3Ads. The extension automatically detects and verifies your ad views.",
              },
              {
                num: "3",
                title: "ACCUMULATE EARNINGS",
                desc: "Each verified view earns you 20% of the ad revenue. Watch your balance grow in the extension popup.",
              },
              {
                num: "4",
                title: "WITHDRAW OR SPEND",
                desc: "Claim USDC to your wallet, or use your balance for gasless transactions and x402 payments.",
              },
            ].map((step) => (
              <div key={step.num} className="flex gap-6 border-4 border-zinc-800 bg-zinc-900 p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center border-4 border-[#ff3e00] font-mono text-2xl font-black text-[#ff3e00]">
                  {step.num}
                </div>
                <div>
                  <h3 className="font-mono text-lg font-black uppercase">{step.title}</h3>
                  <p className="mt-2 font-mono text-xs uppercase leading-relaxed text-zinc-500">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Balance Card (when connected) */}
        {isConnected && (
          <div className="mt-12 border-4 border-zinc-700 bg-zinc-900 p-8 text-center">
            <h2 className="font-mono text-lg font-black uppercase">YOUR VIEWER BALANCE</h2>
            <div className="mt-4">
              <span className="block font-mono text-5xl font-black text-[#ff3e00]">$0.00</span>
              <span className="font-mono text-xs uppercase text-zinc-500">PENDING USDC</span>
            </div>
            <p className="mt-4 font-mono text-xs uppercase text-zinc-600">
              CONNECT THE EXTENSION TO START EARNING
            </p>
          </div>
        )}

        {/* Connect Prompt */}
        {!isConnected && (
          <div className="mt-12 border-4 border-zinc-700 bg-zinc-900 p-8 text-center">
            <p className="font-mono text-sm uppercase text-zinc-400">
              CONNECT WALLET TO VIEW YOUR EARNINGS
            </p>
            <div className="mt-4">
              <WalletButton />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
