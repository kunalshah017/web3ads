import { Link } from "react-router-dom";
import { useAccount } from "wagmi";
import { WalletButton } from "../components/WalletButton";

export function HomePage() {
    const { isConnected } = useAccount();

    return (
        <div className="px-6 py-12">
            {/* Hero Section */}
            <section className="mx-auto max-w-5xl border-4 border-white bg-black p-12 text-center">
                <h1 className="font-mono text-6xl font-black uppercase leading-none tracking-tighter md:text-8xl">
                    ADVERTISING
                    <br />
                    <span className="text-[#ff3e00]">REIMAGINED</span>
                </h1>
                <p className="mx-auto mt-8 max-w-xl font-mono text-sm uppercase leading-relaxed tracking-wider text-zinc-400">
                    A DECENTRALIZED AD PLATFORM WHERE EVERYONE EARNS.
                    <br />
                    ADVERTISERS PAY. PUBLISHERS EARN. VIEWERS GET REWARDED.
                </p>
                {!isConnected && (
                    <div className="mt-8">
                        <WalletButton />
                    </div>
                )}
            </section>

            {/* Role Cards */}
            <section className="mx-auto mt-12 grid max-w-5xl gap-4 md:grid-cols-3">
                {/* Advertise Card */}
                <div className="border-4 border-zinc-700 bg-zinc-900 p-6 transition-all hover:border-white">
                    <div className="text-4xl">📣</div>
                    <h2 className="mt-4 font-mono text-xl font-black uppercase">ADVERTISE</h2>
                    <p className="mt-2 font-mono text-xs uppercase leading-relaxed text-zinc-500">
                        CREATE CAMPAIGNS. SET YOUR BUDGET. REACH REAL USERS ON WEB3 SITES.
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-4 border-t-2 border-zinc-700 pt-4">
                        <div>
                            <span className="block font-mono text-2xl font-black text-[#ff3e00]">$2-8</span>
                            <span className="font-mono text-xs uppercase text-zinc-600">CPM</span>
                        </div>
                        <div>
                            <span className="block font-mono text-2xl font-black text-[#ff3e00]">50%</span>
                            <span className="font-mono text-xs uppercase text-zinc-600">TO PUBS</span>
                        </div>
                    </div>
                    <Link
                        to="/advertiser"
                        className="mt-6 block border-4 border-white bg-black py-3 text-center font-mono text-xs font-bold uppercase tracking-wider text-white no-underline transition-all hover:bg-white hover:text-black"
                    >
                        START ADVERTISING →
                    </Link>
                </div>

                {/* Publish Card */}
                <div className="border-4 border-zinc-700 bg-zinc-900 p-6 transition-all hover:border-white">
                    <div className="text-4xl">🌐</div>
                    <h2 className="mt-4 font-mono text-xl font-black uppercase">PUBLISH</h2>
                    <p className="mt-2 font-mono text-xs uppercase leading-relaxed text-zinc-500">
                        ADD ONE COMPONENT TO YOUR SITE. EARN 50% OF AD REVENUE.
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-4 border-t-2 border-zinc-700 pt-4">
                        <div>
                            <span className="block font-mono text-2xl font-black text-[#ff3e00]">NPM</span>
                            <span className="font-mono text-xs uppercase text-zinc-600">PACKAGE</span>
                        </div>
                        <div>
                            <span className="block font-mono text-2xl font-black text-[#ff3e00]">USDC</span>
                            <span className="font-mono text-xs uppercase text-zinc-600">PAYOUTS</span>
                        </div>
                    </div>
                    <Link
                        to="/publisher"
                        className="mt-6 block border-4 border-white bg-black py-3 text-center font-mono text-xs font-bold uppercase tracking-wider text-white no-underline transition-all hover:bg-white hover:text-black"
                    >
                        START PUBLISHING →
                    </Link>
                </div>

                {/* Earn Card */}
                <div className="border-4 border-zinc-700 bg-zinc-900 p-6 transition-all hover:border-white">
                    <div className="text-4xl">👁️</div>
                    <h2 className="mt-4 font-mono text-xl font-black uppercase">EARN</h2>
                    <p className="mt-2 font-mono text-xs uppercase leading-relaxed text-zinc-500">
                        INSTALL OUR EXTENSION. EARN 20% JUST BY VIEWING ADS.
                    </p>
                    <div className="mt-6 grid grid-cols-2 gap-4 border-t-2 border-zinc-700 pt-4">
                        <div>
                            <span className="block font-mono text-2xl font-black text-[#ff3e00]">ZK</span>
                            <span className="font-mono text-xs uppercase text-zinc-600">PRIVACY</span>
                        </div>
                        <div>
                            <span className="block font-mono text-2xl font-black text-[#ff3e00]">20%</span>
                            <span className="font-mono text-xs uppercase text-zinc-600">SHARE</span>
                        </div>
                    </div>
                    <Link
                        to="/viewer"
                        className="mt-6 block border-4 border-white bg-black py-3 text-center font-mono text-xs font-bold uppercase tracking-wider text-white no-underline transition-all hover:bg-white hover:text-black"
                    >
                        START EARNING →
                    </Link>
                </div>
            </section>

            {/* How It Works */}
            <section className="mx-auto mt-16 max-w-5xl">
                <h2 className="border-b-4 border-zinc-800 pb-4 font-mono text-2xl font-black uppercase">
                    HOW IT WORKS
                </h2>
                <div className="mt-8 grid gap-4 md:grid-cols-4">
                    {[
                        { num: "01", title: "ADVERTISERS DEPOSIT USDC", desc: "Set budget, choose ad type, upload creative" },
                        { num: "02", title: "PUBLISHERS EMBED ADS", desc: "One React component, instant monetization" },
                        { num: "03", title: "VIEWERS GET REWARDED", desc: "zkProof verifies views without tracking" },
                        { num: "04", title: "EVERYONE WITHDRAWS", desc: "Claim USDC or use for gasless txs" },
                    ].map((step) => (
                        <div key={step.num} className="border-l-4 border-[#ff3e00] pl-4">
                            <span className="font-mono text-3xl font-black text-zinc-700">{step.num}</span>
                            <h3 className="mt-2 font-mono text-sm font-bold uppercase">{step.title}</h3>
                            <p className="mt-1 font-mono text-xs uppercase text-zinc-500">{step.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Tech Stack */}
            <section className="mx-auto mt-16 max-w-5xl">
                <h2 className="border-b-4 border-zinc-800 pb-4 font-mono text-2xl font-black uppercase">
                    BUILT WITH
                </h2>
                <div className="mt-8 grid grid-cols-4 gap-4">
                    {["BASE L2", "SEMAPHORE", "USDC", "x402"].map((tech) => (
                        <div
                            key={tech}
                            className="border-4 border-zinc-800 bg-zinc-900 p-4 text-center font-mono text-sm font-bold uppercase tracking-wider text-zinc-400"
                        >
                            {tech}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
