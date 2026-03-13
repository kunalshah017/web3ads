import { useAccount, useConnect, useDisconnect } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Link, useLocation } from "react-router-dom";

export function Navbar() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const location = useLocation();

  const { data: credits } = useQuery({
    queryKey: ["credits", address],
    queryFn: () => api.getCredits(address!),
    enabled: !!address,
    refetchInterval: 5000,
  });

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/watch", label: "Watch Ads" },
    { to: "/transact", label: "Send Tx" },
    { to: "/history", label: "History" },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="brand-icon">⚡</span>
        <span className="brand-text">Web3Ads <span className="brand-accent">Gasless</span></span>
      </div>

      <div className="navbar-links">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`nav-link ${location.pathname === link.to ? "active" : ""}`}
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="navbar-right">
        {isConnected && credits && (
          <div className="credit-badge">
            <span className="credit-icon">🔋</span>
            <span className="credit-value">{credits.credits.toLocaleString()}</span>
            <span className="credit-label">credits</span>
          </div>
        )}

        {isConnected ? (
          <div className="wallet-connected">
            <span className="wallet-address">
              {address?.slice(0, 6)}…{address?.slice(-4)}
            </span>
            <button className="btn-disconnect" onClick={() => disconnect()}>
              Disconnect
            </button>
          </div>
        ) : (
          <button
            className="btn-connect"
            onClick={() => connect({ connector: connectors[0] })}
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}
