"use client";

import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import { BtnSecondary } from "@/components/home/lobby";
import UserAvatar from "@/components/social/UserAvatar";
import { REWARD_POINTS } from "@/lib/rewards";
import { TOKEN_SYMBOL } from "@/lib/constants";

export type ProfileHeroData = {
  displayName: string;
  twitterHandle?: string | null;
  avatar?: string | null;
  walletAddress?: string | null;
  rewardPoints?: number;
  handsWon?: number;
  handsPlayed?: number;
  referralsCount?: number;
};

export default function ProfileHero({
  profile,
  onLinkTwitter,
  linkingTwitter = false,
  twitterLinkError,
}: {
  profile: ProfileHeroData;
  onLinkTwitter?: () => void;
  linkingTwitter?: boolean;
  twitterLinkError?: string | null;
}) {
  const { logout } = usePrivy();
  const winRate =
    profile.handsPlayed && profile.handsPlayed > 0
      ? Math.round(((profile.handsWon ?? 0) / profile.handsPlayed) * 100)
      : 0;

  const walletShort = profile.walletAddress
    ? `${profile.walletAddress.slice(0, 4)}…${profile.walletAddress.slice(-4)}`
    : null;

  return (
    <div className="profile-hero" data-tour="profile-hero">
      <div className="profile-hero-banner" aria-hidden />
      <div className="profile-hero-body">
        <div className="profile-hero-main">
          <UserAvatar
            image={profile.avatar}
            name={profile.displayName}
            size="lg"
            online
          />
          <div className="profile-hero-meta">
            <p className="profile-hero-eyebrow">Your profile</p>
            <h1 className="profile-hero-name">{profile.displayName}</h1>
            {profile.twitterHandle ? (
              <p className="profile-hero-handle">@{profile.twitterHandle}</p>
            ) : (
              <p className="profile-hero-handle-muted">X not linked</p>
            )}
            {walletShort && (
              <p className="profile-hero-wallet">{walletShort} · Solana</p>
            )}
          </div>
        </div>

        <div className="profile-hero-actions">
          {!profile.twitterHandle && onLinkTwitter && (
            <BtnSecondary
              onClick={onLinkTwitter}
              className="profile-verify-btn"
              disabled={linkingTwitter}
            >
              {linkingTwitter ? "Opening X…" : `Verify X · +${REWARD_POINTS.TWITTER_VERIFY} pts`}
            </BtnSecondary>
          )}
          {twitterLinkError && (
            <p className="profile-hero-link-error">{twitterLinkError}</p>
          )}
          {profile.twitterHandle && (
            <span className="profile-verified-badge">✓ Verified on X</span>
          )}
          <Link href="/leaderboard" className="profile-hero-link">
            Leaderboard →
          </Link>
          <button type="button" onClick={logout} className="profile-hero-link">
            Log out
          </button>
        </div>
      </div>

      <div className="profile-hero-stats">
        <Stat label="Reward points" value={(profile.rewardPoints ?? 0).toLocaleString()} accent />
        <Stat label="Hands won" value={String(profile.handsWon ?? 0)} />
        <Stat label="Hands played" value={String(profile.handsPlayed ?? 0)} />
        <Stat label="Win rate" value={`${winRate}%`} />
        <Stat label="Referrals" value={String(profile.referralsCount ?? 0)} />
        <Stat label="Token" value={TOKEN_SYMBOL.replace("$", "")} hint="On-chain" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className={`profile-hero-stat${accent ? " profile-hero-stat-accent" : ""}`}>
      <p className="profile-hero-stat-label">{label}</p>
      <p className="profile-hero-stat-value">{value}</p>
      {hint && <p className="profile-hero-stat-hint">{hint}</p>}
    </div>
  );
}
