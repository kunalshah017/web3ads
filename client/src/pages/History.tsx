import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { api, type TxRecord } from "../lib/api";

function statusBadge(status: TxRecord["status"]) {
  const map: Record<TxRecord["status"], { label: string; cls: string }> = {
    pending:   { label: "Pending",   cls: "badge-pending" },
    submitted: { label: "Submitted", cls: "badge-submitted" },
    confirmed: { label: "Confirmed", cls: "badge-confirmed" },
    failed:    { label: "Failed",    cls: "badge-failed" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "" };
  return <span className={`status-badge ${cls}`}>{label}</span>;
}

export function History() {
  const { address, isConnected } = useAccount();

  const { data, isLoading } = useQuery({
    queryKey: ["history", address],
    queryFn: () => api.getTxHistory(address!),
    enabled: !!address,
    refetchInterval: 5000,
  });

  if (!isConnected) {
    return (
      <div className="page centered">
        <div className="connect-prompt">
          <div className="connect-icon">🔒</div>
          <h2>Connect your wallet first</h2>
        </div>
      </div>
    );
  }

  const txs = data?.txs ?? [];

  return (
    <div className="page history-page">
      <div className="page-header">
        <h1 className="page-title">Transaction History</h1>
        <p className="page-subtitle">Your gasless transactions — you paid 0 ETH for each</p>
      </div>

      {isLoading && (
        <div className="loading-msg">Loading…</div>
      )}

      {!isLoading && txs.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <h3>No transactions yet</h3>
          <p>Watch an ad and send your first gasless transaction!</p>
        </div>
      )}

      {txs.length > 0 && (
        <div className="tx-list">
          {txs.map((tx) => (
            <div key={tx.id} className="tx-row">
              <div className="tx-row-left">
                <div className="tx-row-icon">
                  {tx.status === "confirmed" ? "✅" : tx.status === "failed" ? "❌" : "⏳"}
                </div>
                <div>
                  <div className="tx-row-hash">
                    {tx.tx_hash ? (
                      <a
                        href={`https://sepolia.basescan.org/tx/${tx.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tx-hash-link"
                      >
                        {tx.tx_hash.slice(0, 10)}…{tx.tx_hash.slice(-6)}
                      </a>
                    ) : (
                      <span className="tx-no-hash">— pending —</span>
                    )}
                  </div>
                  <div className="tx-row-time">
                    {new Date(tx.created_at * 1000).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="tx-row-right">
                <div className="tx-credits-used">
                  -{Number(tx.credits_used).toLocaleString()} credits
                </div>
                {statusBadge(tx.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
