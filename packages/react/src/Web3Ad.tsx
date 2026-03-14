import { useEffect, useRef, useState, useCallback } from "react";
import type { Web3AdProps, AdData } from "./types";
import { AD_DIMENSIONS } from "./types";
import { fetchAd, recordImpression, getViewerCommitment } from "./api";

/**
 * Minimum time ad must be visible to count as impression (ms)
 */
const MIN_VIEW_TIME = 1000;

/**
 * Minimum visibility percentage to count as viewable
 */
const MIN_VISIBILITY = 0.5;

/**
 * Web3Ad - Monetize your site with privacy-preserving ads
 *
 * @example
 * ```tsx
 * <Web3Ad
 *   publisherWallet="0x123..."
 *   type="banner"
 *   category="defi"
 *   onImpression={(adId) => console.log('Impression:', adId)}
 * />
 * ```
 */
export function Web3Ad({
  publisherWallet,
  type,
  category,
  onImpression,
  onClick,
  onError,
  className,
  showFallback = true,
  testMode = false,
}: Web3AdProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ad, setAd] = useState<AdData | null>(null);
  const [loading, setLoading] = useState(true);
  const [impressionRecorded, setImpressionRecorded] = useState(false);
  const viewStartTime = useRef<number | null>(null);
  const visibilityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dimensions = AD_DIMENSIONS[type];

  // Fetch ad on mount
  useEffect(() => {
    if (testMode) {
      setAd({
        id: "test-ad-id",
        campaignId: "test-campaign",
        advertiser: "0x0000000000000000000000000000000000000000",
        imageUrl: `https://placehold.co/${dimensions.width}x${dimensions.height}/1a1a1a/ff3e00?text=Web3Ads+${type.toUpperCase()}`,
        targetUrl: "https://web3ads.io",
        type,
        cpmRate: 2,
      });
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadAd() {
      try {
        const adData = await fetchAd({ publisherWallet, type, category });
        if (!cancelled) {
          setAd(adData);
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setLoading(false);
          onError?.(error instanceof Error ? error : new Error(String(error)));
        }
      }
    }

    loadAd();

    return () => {
      cancelled = true;
    };
  }, [publisherWallet, type, category, testMode, dimensions.width, dimensions.height, onError]);

  // Record impression when ad is viewed
  const handleImpression = useCallback(async () => {
    if (!ad || impressionRecorded || testMode) return;

    const viewDuration = viewStartTime.current ? Date.now() - viewStartTime.current : MIN_VIEW_TIME;

    // Get viewer commitment from extension if installed
    const viewerCommitment = await getViewerCommitment();

    const success = await recordImpression({
      adId: ad.id,
      campaignId: ad.campaignId,
      publisherWallet,
      viewerCommitment,
      timestamp: Date.now(),
      pageUrl: typeof window !== "undefined" ? window.location.href : "",
      viewDuration,
    });

    if (success) {
      setImpressionRecorded(true);
      onImpression?.(ad.id);
    }
  }, [ad, impressionRecorded, publisherWallet, testMode, onImpression]);

  // Viewability tracking with IntersectionObserver
  useEffect(() => {
    if (!ad || impressionRecorded || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting && entry.intersectionRatio >= MIN_VISIBILITY) {
          // Ad became visible
          if (!viewStartTime.current) {
            viewStartTime.current = Date.now();
          }

          // Start timer for minimum view duration
          if (!visibilityTimer.current) {
            visibilityTimer.current = setTimeout(() => {
              handleImpression();
            }, MIN_VIEW_TIME);
          }
        } else {
          // Ad became hidden - reset timer
          if (visibilityTimer.current) {
            clearTimeout(visibilityTimer.current);
            visibilityTimer.current = null;
          }
          viewStartTime.current = null;
        }
      },
      {
        threshold: MIN_VISIBILITY,
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      if (visibilityTimer.current) {
        clearTimeout(visibilityTimer.current);
      }
    };
  }, [ad, impressionRecorded, handleImpression]);

  // Handle ad click
  const handleClick = () => {
    if (!ad) return;
    onClick?.(ad.id);
    window.open(ad.targetUrl, "_blank", "noopener,noreferrer");
  };

  // Render states
  if (loading) {
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        data-web3ads="loading"
      >
        <div
          style={{
            width: 24,
            height: 24,
            border: "3px solid #333",
            borderTopColor: "#ff3e00",
            borderRadius: "50%",
            animation: "web3ads-spin 1s linear infinite",
          }}
        />
        <style>{`
          @keyframes web3ads-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!ad) {
    if (!showFallback) return null;

    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          width: dimensions.width,
          height: dimensions.height,
          backgroundColor: "#1a1a1a",
          border: "2px dashed #333",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontFamily: "monospace",
          fontSize: 12,
        }}
        data-web3ads="fallback"
      >
        AD SPACE AVAILABLE
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: dimensions.width,
        height: dimensions.height,
        cursor: "pointer",
        position: "relative",
        overflow: "hidden",
      }}
      onClick={handleClick}
      data-web3ads="ad"
      data-web3ads-id={ad.id}
    >
      <img
        src={ad.imageUrl}
        alt="Advertisement"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        loading="lazy"
      />
      <div
        style={{
          position: "absolute",
          bottom: 2,
          right: 2,
          backgroundColor: "rgba(0,0,0,0.7)",
          color: "#999",
          fontSize: 9,
          padding: "2px 4px",
          fontFamily: "monospace",
        }}
      >
        Web3Ads
      </div>
    </div>
  );
}
