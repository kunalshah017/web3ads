import { Outlet, Link, useLocation } from "react-router-dom";
import { WalletButton } from "./WalletButton";

export function Layout() {
    const location = useLocation();

    const navItems = [
        { path: "/advertiser", label: "ADVERTISE" },
        { path: "/publisher", label: "PUBLISH" },
        { path: "/viewer", label: "EARN" },
        { path: "/dashboard", label: "DASHBOARD" },
    ];

    return (
        <div className="flex min-h-screen flex-col bg-black text-white">
            <header className="flex items-center justify-between border-b-4 border-white px-6 py-4">
                <Link to="/" className="flex items-center gap-3 text-white no-underline">
                    <span className="text-3xl text-[#ff3e00]">◈</span>
                    <span className="font-mono text-xl font-black uppercase tracking-widest">WEB3ADS</span>
                </Link>
                <nav className="flex gap-1">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`border-4 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider no-underline transition-all ${location.pathname === item.path
                                    ? "border-[#ff3e00] bg-[#ff3e00] text-white"
                                    : "border-transparent text-zinc-400 hover:border-zinc-700 hover:text-white"
                                }`}
                        >
                            {item.label}
                        </Link>
                    ))}
                </nav>
                <WalletButton />
            </header>
            <main className="flex-1">
                <Outlet />
            </main>
            <footer className="border-t-4 border-zinc-800 px-6 py-6 text-center">
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-zinc-500">
                    BUILT FOR ETHMUMBAI 2026
                </p>
                <div className="mt-2 flex items-center justify-center gap-3 font-mono text-xs text-zinc-600">
                    <span>BASE L2</span>
                    <span className="text-[#ff3e00]">•</span>
                    <span>SEMAPHORE</span>
                    <span className="text-[#ff3e00]">•</span>
                    <span>USDC</span>
                </div>
            </footer>
        </div>
    );
}
