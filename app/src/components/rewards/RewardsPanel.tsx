"use client";

import Link from "next/link";
import { LobbyCard } from "@/components/home/lobby";
import ReferralInviteCard from "@/components/rewards/ReferralInviteCard";
import PointRedemptionCard from "@/components/rewards/PointRedemptionCard";
import { BtnSecondary } from "@/components/home/lobby";
import { REWARD_POINTS } from "@/lib/rewards";
import { TOKEN_SYMBOL } from "@/lib/constants";

export default function RewardsPanel({
  rewardPoints = 0,
  playRewardPoints = 0,
  referralRewardPoints = 0,
  referralsCount = 0,
  handsPlayed = 0,
  twitterHandle,
  onLinkTwitter,
  onPointsChange,
}: {
  rewardPoints?: number;
  playRewardPoints?: number;
  referralRewardPoints?: number;
  referralsCount?: number;
  handsPlayed?: number;
  twitterHandle?: string | null;
  onLinkTwitter?: () => void;
  onPointsChange?: (points: number) => void;
}) {
  const profilePoints =
    Math.max(0, rewardPoints - playRewardPoints - referralRewardPoints);

  return (
    <div className="space-y-4">
      <LobbyCard className="premium-rewards-hero overflow-hidden p-0" hover={false}>
        <div className="premium-rewards-hero-top">
          <div>
            <p className="premium-label">Reward points</p>
            <p className="premium-rewards-total">{rewardPoints.toLocaleString()}</p>
            <p className="premium-refer-sub mt-2">
              Earn by playing, inviting friends, and verifying X
            </p>
          </div>
          <div className="premium-rewards-orbs" aria-hidden />
        </div>
        <div className="premium-rewards-stats">
          <Stat
            label="From playing"
            value={playRewardPoints}
            hint={`+${REWARD_POINTS.HAND_PLAYED} per hand · ${handsPlayed} played`}
          />
          <Stat
            label="From invites"
            value={referralRewardPoints}
            hint={`${referralsCount} friend${referralsCount === 1 ? "" : "s"} joined`}
          />
          <Stat
            label="Profile & verify"
            value={profilePoints}
            hint={`+${REWARD_POINTS.TWITTER_VERIFY} for X verify`}
          />
        </div>
      </LobbyCard>

      {!twitterHandle && onLinkTwitter && (
        <LobbyCard className="premium-rewards-verify p-5" hover={false}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="premium-label">Verify X profile</p>
              <p className="mt-1 text-sm font-semibold text-zinc-200">
                Link Twitter for +{REWARD_POINTS.TWITTER_VERIFY} points
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Shows your handle on leaderboards and lets friends find you by @username.
              </p>
            </div>
            <BtnSecondary onClick={onLinkTwitter} className="shrink-0">
              Verify X
            </BtnSecondary>
          </div>
        </LobbyCard>
      )}

      {twitterHandle && (
        <LobbyCard className="border-emerald-500/20 bg-emerald-500/[0.04] p-4" hover={false}>
          <p className="text-sm text-emerald-300">
            ✓ Verified as @{twitterHandle} · friends can add you by handle
          </p>
        </LobbyCard>
      )}

      <PointRedemptionCard
        rewardPoints={rewardPoints}
        onRedeemed={onPointsChange}
      />

      <ReferralInviteCard variant="profile" />

      <p className="text-center text-[11px] text-zinc-600">
        Tokenomics flywheel explained in our{" "}
        <Link href="/terms" className="text-violet-400 hover:text-violet-300">
          Terms of Service
        </Link>
        .
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  suffix = "",
}: {
  label: string;
  value: number;
  hint: string;
  suffix?: string;
}) {
  return (
    <div className="premium-rewards-stat">
      <p className="premium-label">{label}</p>
      <p className="premium-stat-value">
        {value.toLocaleString()}
        {suffix}
      </p>
      <p className="premium-stat-hint">{hint}</p>
    </div>
  );
}
