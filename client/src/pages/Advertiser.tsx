import { useAccount } from "wagmi";
import { WalletButton } from "../components/WalletButton";

export function AdvertiserPage() {
  const { isConnected, address } = useAccount();

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
        <div className="mb-8 border-b-4 border-zinc-800 pb-4">
          <h1 className="font-mono text-3xl font-black uppercase">ADVERTISER DASHBOARD</h1>
          <p className="mt-2 font-mono text-xs uppercase text-zinc-500">{address}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Create Campaign Form */}
          <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
            <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
              CREATE CAMPAIGN
            </h2>
            <form className="mt-6 space-y-4">
              <div>
                <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                  CAMPAIGN NAME
                </label>
                <input
                  type="text"
                  placeholder="My First Campaign"
                  className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#ff3e00] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                  AD TYPE
                </label>
                <select className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white focus:border-[#ff3e00] focus:outline-none">
                  <option value="banner">BANNER (728x90) - $2 CPM</option>
                  <option value="square">SQUARE (300x300) - $3 CPM</option>
                  <option value="sidebar">SIDEBAR (300x600) - $4 CPM</option>
                  <option value="interstitial">INTERSTITIAL - $8 CPM</option>
                </select>
              </div>
              <div>
                <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                  BUDGET (USDC)
                </label>
                <input
                  type="number"
                  placeholder="100"
                  min="10"
                  className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#ff3e00] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                  CREATIVE (IMAGE URL)
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#ff3e00] focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-mono text-xs font-bold uppercase text-zinc-400">
                  TARGET URL
                </label>
                <input
                  type="text"
                  placeholder="https://your-site.com"
                  className="mt-2 w-full border-4 border-zinc-700 bg-black px-4 py-3 font-mono text-sm text-white placeholder-zinc-600 focus:border-[#ff3e00] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full border-4 border-[#ff3e00] bg-[#ff3e00] py-4 font-mono text-sm font-bold uppercase tracking-wider text-white transition-all hover:bg-black"
              >
                CREATE & DEPOSIT USDC
              </button>
            </form>
          </div>

          {/* Campaigns List & Stats */}
          <div className="space-y-6">
            <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
              <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
                YOUR CAMPAIGNS
              </h2>
              <div className="flex min-h-[200px] flex-col items-center justify-center text-center">
                <p className="font-mono text-sm font-bold uppercase text-zinc-500">NO CAMPAIGNS YET</p>
                <p className="mt-2 font-mono text-xs uppercase text-zinc-600">
                  CREATE YOUR FIRST CAMPAIGN TO START ADVERTISING
                </p>
              </div>
            </div>

            <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
              <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
                STATS
              </h2>
              <div className="mt-4 grid grid-cols-2 gap-4">
                {[
                  { value: "0", label: "CAMPAIGNS" },
                  { value: "$0", label: "TOTAL SPENT" },
                  { value: "0", label: "IMPRESSIONS" },
                  { value: "$0", label: "REMAINING" },
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
