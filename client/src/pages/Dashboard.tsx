import { useAccount } from "wagmi";
import { WalletButton } from "../components/WalletButton";
import { Link } from "react-router-dom";

export function DashboardPage() {
  const { isConnected, address } = useAccount();

  if (!isConnected) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
        <div className="border-4 border-zinc-700 bg-zinc-900 p-12 text-center">
          <h1 className="font-mono text-3xl font-black uppercase">DASHBOARD</h1>
          <p className="mt-4 font-mono text-sm uppercase text-zinc-500">
            CONNECT YOUR WALLET TO VIEW YOUR ACTIVITY
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
          <h1 className="font-mono text-3xl font-black uppercase">DASHBOARD</h1>
          <p className="mt-2 font-mono text-xs uppercase text-zinc-500">{address}</p>
        </div>

        {/* Overview Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Total Balance */}
          <div className="border-4 border-[#ff3e00] bg-zinc-900 p-6">
            <h2 className="font-mono text-lg font-black uppercase">TOTAL BALANCE</h2>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-mono text-5xl font-black text-[#ff3e00]">$0.00</span>
              <span className="font-mono text-sm uppercase text-zinc-500">USDC</span>
            </div>
            <div className="mt-6 space-y-2 border-t-2 border-zinc-700 pt-4">
              <div className="flex justify-between font-mono text-xs uppercase">
                <span className="text-zinc-500">Publisher Earnings</span>
                <span className="text-white">$0.00</span>
              </div>
              <div className="flex justify-between font-mono text-xs uppercase">
                <span className="text-zinc-500">Viewer Earnings</span>
                <span className="text-white">$0.00</span>
              </div>
            </div>
            <button
              disabled
              className="mt-6 w-full border-4 border-zinc-700 bg-zinc-800 py-3 font-mono text-xs font-bold uppercase tracking-wider text-zinc-500 transition-all disabled:cursor-not-allowed"
            >
              WITHDRAW ALL
            </button>
          </div>

          {/* Quick Actions */}
          <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
            <h2 className="font-mono text-lg font-black uppercase">QUICK ACTIONS</h2>
            <div className="mt-4 grid gap-3">
              <Link
                to="/advertiser"
                className="flex items-center gap-4 border-4 border-zinc-700 bg-black p-4 no-underline transition-all hover:border-white"
              >
                <span className="text-2xl">📣</span>
                <span className="font-mono text-xs font-bold uppercase text-white">CREATE CAMPAIGN</span>
              </Link>
              <Link
                to="/publisher"
                className="flex items-center gap-4 border-4 border-zinc-700 bg-black p-4 no-underline transition-all hover:border-white"
              >
                <span className="text-2xl">📋</span>
                <span className="font-mono text-xs font-bold uppercase text-white">GET EMBED CODE</span>
              </Link>
              <Link
                to="/viewer"
                className="flex items-center gap-4 border-4 border-zinc-700 bg-black p-4 no-underline transition-all hover:border-white"
              >
                <span className="text-2xl">🧩</span>
                <span className="font-mono text-xs font-bold uppercase text-white">INSTALL EXTENSION</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Activity Sections */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          {/* Advertiser Activity */}
          <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
            <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-sm font-black uppercase">
              ADVERTISER
            </h2>
            <div className="mt-4 space-y-4">
              {[
                { value: "0", label: "Active Campaigns" },
                { value: "0", label: "Total Impressions" },
                { value: "$0", label: "Total Spent" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase text-zinc-500">{stat.label}</span>
                  <span className="font-mono text-lg font-black text-white">{stat.value}</span>
                </div>
              ))}
            </div>
            <Link
              to="/advertiser"
              className="mt-4 block font-mono text-xs font-bold uppercase text-[#ff3e00] no-underline transition-all hover:text-white"
            >
              MANAGE CAMPAIGNS →
            </Link>
          </div>

          {/* Publisher Activity */}
          <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
            <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-sm font-black uppercase">
              PUBLISHER
            </h2>
            <div className="mt-4 space-y-4">
              {[
                { value: "0", label: "Total Views" },
                { value: "$0", label: "Earned" },
                { value: "$0", label: "Pending" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase text-zinc-500">{stat.label}</span>
                  <span className="font-mono text-lg font-black text-white">{stat.value}</span>
                </div>
              ))}
            </div>
            <Link
              to="/publisher"
              className="mt-4 block font-mono text-xs font-bold uppercase text-[#ff3e00] no-underline transition-all hover:text-white"
            >
              VIEW EARNINGS →
            </Link>
          </div>

          {/* Viewer Activity */}
          <div className="border-4 border-zinc-700 bg-zinc-900 p-6">
            <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-sm font-black uppercase">
              VIEWER
            </h2>
            <div className="mt-4 space-y-4">
              {[
                { value: "0", label: "Ads Viewed" },
                { value: "$0", label: "Earned" },
                { value: "—", label: "Extension" },
              ].map((stat) => (
                <div key={stat.label} className="flex items-center justify-between">
                  <span className="font-mono text-xs uppercase text-zinc-500">{stat.label}</span>
                  <span className="font-mono text-lg font-black text-white">{stat.value}</span>
                </div>
              ))}
            </div>
            <Link
              to="/viewer"
              className="mt-4 block font-mono text-xs font-bold uppercase text-[#ff3e00] no-underline transition-all hover:text-white"
            >
              INSTALL EXTENSION →
            </Link>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mt-8 border-4 border-zinc-700 bg-zinc-900 p-6">
          <h2 className="border-b-2 border-zinc-700 pb-3 font-mono text-lg font-black uppercase">
            RECENT TRANSACTIONS
          </h2>
          <div className="flex min-h-[100px] items-center justify-center">
            <p className="font-mono text-sm font-bold uppercase text-zinc-500">NO TRANSACTIONS YET</p>
          </div>
        </div>
      </div>
    </div>
  );
}
