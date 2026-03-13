import { useState, useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { Link } from "react-router-dom";

const AD_DURATION = 30; // seconds

export function WatchAd() {
  const { address, isConnected } = useAccount();
  const queryClient = useQueryClient();
  const [timeLeft, setTimeLeft] = useState(AD_DURATION);
  const [watching, setWatching] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [earned, setEarned] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: adData, refetch: fetchNextAd } = useQuery({
    queryKey: ["current-ad"],
    queryFn: api.getNextAd,
  });

  const awardMutation = useMutation({
    mutationFn: ({ wallet, adId }: { wallet: string; adId: string }) =>
      api.watchedAd(wallet, adId),
    onSuccess: (data) => {
      setEarned(data.earned);
      setCompleted(true);
      queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
  });

  const startWatching = () => {
    if (!adData?.ad || !address) return;
    setWatching(true);
    setCompleted(false);
    setTimeLeft(AD_DURATION);

    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current!);
          setWatching(false);
          awardMutation.mutate({ wallet: address, adId: adData.ad.id });
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const resetAd = () => {
    setCompleted(false);
    setWatching(false);
    setTimeLeft(AD_DURATION);
    fetchNextAd();
  };

  useEffect(() => () => clearInterval(intervalRef.current!), []);

  if (!isConnected) {
    return (
      <div className="page centered">
        <div className="connect-prompt">
          <div className="connect-icon">🔒</div>
          <h2>Connect your wallet first</h2>
          <p>You need a wallet to earn and track gas credits.</p>
        </div>
      </div>
    );
  }

  const ad = adData?.ad;
  const progress = ((AD_DURATION - timeLeft) / AD_DURATION) * 100;

  return (
    <div className="page watch-page">
      <div className="page-header">
        <h1 className="page-title">Watch &amp; Earn</h1>
        <p className="page-subtitle">Complete a 30s ad to earn 50,000 gas credits</p>
      </div>

      {completed ? (
        <div className="success-card">
          <div className="success-icon">🎉</div>
          <h2>Credits Earned!</h2>
          <div className="earned-amount">+{earned.toLocaleString()} credits</div>
          <p>Ready to make a gasless transaction?</p>
          <div className="success-actions">
            <Link to="/transact" className="btn-primary">⚡ Send Gasless Tx</Link>
            <button className="btn-secondary" onClick={resetAd}>Watch Another</button>
          </div>
        </div>
      ) : (
        <div className="ad-container">
          {ad && (
            <>
              <div className={`ad-card ${watching ? "watching" : ""}`}>
                <div className="ad-image-wrap">
                  <img src={ad.imageUrl} alt={ad.title} className="ad-image" />
                  {watching && (
                    <div className="ad-overlay">
                      <div className="watching-label">📺 Watching…</div>
                    </div>
                  )}
                </div>
                <div className="ad-info">
                  <h3 className="ad-title">{ad.title}</h3>
                  <p className="ad-desc">{ad.description}</p>
                  <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer" className="ad-link">
                    Learn more ↗
                  </a>
                </div>
              </div>

              {/* Progress bar */}
              {watching && (
                <div className="progress-wrap">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="timer-label">
                    <span className="timer-value">{timeLeft}s</span> remaining
                  </div>
                </div>
              )}

              {!watching && (
                <div className="ad-actions">
                  <button
                    className="btn-primary btn-lg watch-btn"
                    onClick={startWatching}
                    disabled={awardMutation.isPending}
                  >
                    🎬 Start Watching (earn 50,000 credits)
                  </button>
                  {awardMutation.isError && (
                    <p className="error-msg">
                      {(awardMutation.error as Error)?.message}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
