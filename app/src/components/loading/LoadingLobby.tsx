"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BrandChipMark from "@/components/brand/BrandChipMark";
import ReferralInviteCard from "@/components/rewards/ReferralInviteCard";
import { BRAND_NAME, TOKEN_SYMBOL } from "@/lib/constants";
import { playerAvatarUrl } from "@/lib/avatars";
import LoadingPageShell from "@/components/loading/LoadingPageShell";
import { LoadingLobbyIcon } from "@/components/loading/LoadingLobbyIcons";
import { MIN_LOADING_SCREEN_MS } from "@/hooks/useMinLoadingDuration";

type StepState = "done" | "active" | "waiting";

interface LoadingLobbyProps {
  /** 0–100; if omitted, animates automatically */
  progress?: number;
  subtitle?: string;
  playersOnline?: number;
  tablesActive?: number;
  assetProgress?: number;
}

const LIVE_FEED = [
  { user: "@ChainLord", action: "Won a bounty", amount: "+2,450", secondsAgo: 2 },
  { user: "@PokerKing", action: "Completed a bounty", amount: "+1,820", secondsAgo: 5 },
  { user: "@BluffMaster", action: "Won a bounty", amount: "+3,200", secondsAgo: 8 },
  { user: "@SharkLegend", action: "Completed a bounty", amount: "+1,150", secondsAgo: 12 },
  { user: "@DegenHero", action: "Won a bounty", amount: "+2,780", secondsAgo: 18 },
]
  .map((item) => ({ ...item, avatar: playerAvatarUrl(item.user, 64) }))
  .sort((a, b) => a.secondsAgo - b.secondsAgo);

const TIP_SLIDES = [
  "High stakes tables give higher bounties. Play smart.",
  "Sit at tables with higher average stack to play bigger pots and earn more.",
  "Bounties scale with table size — move up when you're ready.",
  "All platform fees from bounties go to the winner.",
];

function stepState(progress: number, threshold: number, next: number): StepState {
  if (progress >= next) return "done";
  if (progress >= threshold) return "active";
  return "waiting";
}

function StepIcon({ state }: { state: StepState }) {
  if (state === "done") {
    return (
      <span className="loading-step-icon loading-step-icon-done">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </span>
    );
  }
  if (state === "active") {
    return <span className="loading-step-icon loading-step-icon-active" />;
  }
  return <span className="loading-step-icon loading-step-icon-wait" />;
}

function DonutChart() {
  return (
    <div className="loading-donut" aria-hidden>
      <div className="loading-donut-ring" />
      <div className="loading-donut-hole" />
    </div>
  );
}

export default function LoadingLobby({
  progress: externalProgress,
  subtitle = "Fetching tables, players, and game data…",
  playersOnline = 1247,
  tablesActive = 156,
  assetProgress: externalAssetProgress,
}: LoadingLobbyProps) {
  const [autoProgress, setAutoProgress] = useState(0);
  const [assetAuto, setAssetAuto] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  const progress = externalProgress ?? autoProgress;
  const assetProgress = externalAssetProgress ?? assetAuto;

  useEffect(() => {
    if (externalProgress !== undefined) return;
    const start = Date.now();
    const duration = MIN_LOADING_SCREEN_MS * 0.92;
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const base = Math.min(96, (elapsed / duration) * 96);
      setAutoProgress(base + Math.random() * 1.5);
    }, 180);
    return () => clearInterval(id);
  }, [externalProgress]);

  useEffect(() => {
    if (externalAssetProgress !== undefined) return;
    const start = Date.now();
    const duration = MIN_LOADING_SCREEN_MS * 0.95;
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      const base = Math.min(98, (elapsed / duration) * 98);
      setAssetAuto(base + Math.random());
    }, 180);
    return () => clearInterval(id);
  }, [externalAssetProgress]);

  useEffect(() => {
    const id = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIP_SLIDES.length);
    }, 5200);
    return () => clearInterval(id);
  }, []);

  const steps = useMemo(
    () => [
      { label: "Wallet Connected", detail: "Completed", state: stepState(progress, 0, 12) },
      { label: "Game Servers", detail: "Connected", state: stepState(progress, 12, 28) },
      { label: "On-Chain Verification", detail: "Verified", state: stepState(progress, 28, 45) },
      { label: "Player Data", detail: progress >= 65 ? "Synced" : "Loading…", state: stepState(progress, 45, 65) },
      {
        label: "Table Initialization",
        detail: progress >= 88 ? "Ready" : `${Math.min(99, Math.round(progress))}%`,
        state: stepState(progress, 65, 88),
      },
      {
        label: "Almost Ready",
        detail: progress >= 96 ? "Ready" : "Waiting",
        state: stepState(progress, 88, 96),
      },
    ],
    [progress]
  );

  const eta = progress >= 90 ? "< 1s" : progress >= 60 ? "2–4s" : "4–8s";

  return (
    <LoadingPageShell>
      <div className="loading-lobby">
        <div className="loading-lobby-grid">
          <aside className="loading-lobby-left">
            <div className="loading-glass-card loading-status-card">
              <div className="flex items-center justify-between">
                <p className="loading-card-label">Lobby status</p>
                <span className="loading-pulse-dot" />
              </div>
              <p className="loading-status-heading">Connecting to lobby</p>
              <p className="loading-status-pct">{Math.round(progress)}%</p>
              <div className="loading-progress-track loading-progress-track-lg">
                <div className="loading-progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <ul className="loading-step-list">
                {steps.map((step) => (
                  <li key={step.label} className={`loading-step loading-step-${step.state}`}>
                    <StepIcon state={step.state} />
                    <div className="min-w-0 flex-1">
                      <p className="loading-step-label">{step.label}</p>
                      <p className="loading-step-detail">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="loading-glass-card loading-tips-card">
              <p className="loading-card-label">
                <span className="loading-tips-bulb" aria-hidden>
                  <LoadingLobbyIcon name="bulb" tone="amber" className="!h-7 !w-7" />
                </span>{" "}
                Tips
              </p>
              <p className="loading-tips-text">
                Sit at tables with higher average stack to play bigger pots and earn more.
              </p>
            </div>

            <ReferralInviteCard variant="loading" />
          </aside>

          <main className="loading-lobby-center">
            <div className="loading-hero-brand">
              <BrandChipMark
                variant="lockup"
                size="xl"
                priority
                showTagline
                className="loading-hero-chip"
              />
            </div>

            <p className="loading-welcome">Welcome to {BRAND_NAME}</p>
            <h1 className="loading-title">Loading lobby</h1>
            <p className="loading-subtitle">{subtitle}</p>

            {/* Penthouse table shows through this transparent stage */}
            <div className="loading-table-stage" aria-hidden />

            <div className="loading-stats-bar">
              <div className="loading-stat">
                <LoadingLobbyIcon name="clock" tone="green" />
                <div>
                  <p className="loading-stat-label">Estimated time</p>
                  <p className="loading-stat-value">{eta}</p>
                </div>
              </div>
              <div className="loading-stat">
                <LoadingLobbyIcon name="users" tone="green" />
                <div>
                  <p className="loading-stat-label">Players online</p>
                  <p className="loading-stat-value">{playersOnline.toLocaleString()}</p>
                </div>
              </div>
              <div className="loading-stat">
                <LoadingLobbyIcon name="table" tone="purple" />
                <div>
                  <p className="loading-stat-label">Tables active</p>
                  <p className="loading-stat-value">{tablesActive}</p>
                </div>
              </div>
            </div>

            <p className="loading-star-tip">
              <span>★</span> {TIP_SLIDES[tipIndex]}
            </p>
            <div className="loading-tip-dots" aria-hidden>
              {TIP_SLIDES.map((_, i) => (
                <span
                  key={i}
                  className={`loading-tip-dot${i === tipIndex ? " loading-tip-dot-active" : ""}`}
                />
              ))}
            </div>
          </main>

          <aside className="loading-lobby-right">
            <div className="loading-glass-card loading-activity-card">
              <div className="flex items-center justify-between">
                <p className="loading-card-label">Live activity</p>
                <span className="loading-live-badge">Live</span>
              </div>
              <ul className="loading-activity-list">
                {LIVE_FEED.map((item) => (
                  <li key={`${item.user}-${item.secondsAgo}`} className="loading-activity-item">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.avatar} alt="" className="loading-activity-avatar" />
                    <div className="min-w-0 flex-1">
                      <p className="loading-activity-user">{item.user}</p>
                      <p className="loading-activity-action">{item.action}</p>
                    </div>
                    <div className="text-right">
                      <p className="loading-activity-amount">
                        {item.amount} {TOKEN_SYMBOL}
                      </p>
                      <p className="loading-activity-ago">{item.secondsAgo}s ago</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="loading-glass-card loading-fee-card">
              <div className="flex items-center justify-between">
                <p className="loading-card-label">Fee routing</p>
                <LoadingLobbyIcon name="solana" tone="purple" className="!h-7 !w-7" />
              </div>
              <p className="loading-fee-big">
                20% <span>to winner</span>
              </p>
              <div className="flex items-center gap-4">
                <DonutChart />
                <p className="loading-fee-copy">
                  All platform fees from bounties go to the winner.
                </p>
              </div>
            </div>
          </aside>
        </div>

        <footer className="loading-lobby-footer">
          <div className="loading-assets-row">
            <span className="loading-assets-label">Loading assets</span>
            <div className="loading-progress-track loading-progress-track-sm">
              <div className="loading-progress-fill" style={{ width: `${assetProgress}%` }} />
            </div>
            <span className="loading-assets-pct">{Math.round(assetProgress)}%</span>
          </div>

          <div className="loading-features">
            {[
              { icon: "shield" as const, tone: "purple" as const, title: "100% on-chain", sub: "Provably fair & transparent" },
              { icon: "lock" as const, tone: "green" as const, title: "Your assets", sub: "You always own your money" },
              { icon: "bolt" as const, tone: "amber" as const, title: "Instant play", sub: "Low fees · fast transactions" },
              { icon: "trophy" as const, tone: "purple" as const, title: "Real rewards", sub: "Win bounties · earn more" },
            ].map((f) => (
              <div key={f.title} className="loading-feature">
                <LoadingLobbyIcon name={f.icon} tone={f.tone} />
                <div>
                  <p className="loading-feature-title">{f.title}</p>
                  <p className="loading-feature-sub">{f.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <BrandChipMark variant="icon" size="md" className="loading-footer-mark opacity-50" />
          <div className="loading-footer-links">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </div>
        </footer>
      </div>
    </LoadingPageShell>
  );
}
