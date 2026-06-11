"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import LobbyAssetImage from "@/components/home/LobbyAssetImage";
import GuestInfoBox from "@/components/ui/GuestInfoBox";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { REWARD_POINTS } from "@/lib/rewards";

type ReferralData = {
  referralCode: string;
  referralLink: string;
  rewardPoints: number;
  referralsCount: number;
};

type Variant = "loading" | "profile";

export default function ReferralInviteCard({ variant = "loading" }: { variant?: Variant }) {
  const { authenticated, ready } = usePrivy();
  const authFetch = useAuthFetch();
  const [data, setData] = useState<ReferralData | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!authenticated) return;
    authFetch("/api/referral")
      .then((r) => r.json())
      .then((d) => {
        if (d.referralCode) setData(d);
      })
      .catch(() => {});
  }, [authenticated, authFetch]);

  const copyLink = useCallback(async () => {
    if (!data?.referralLink) return;
    setBusy(true);
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }, [data?.referralLink]);

  const isLoadingCard = variant === "loading";

  return (
    <div className={isLoadingCard ? "loading-glass-card loading-refer-card premium-refer-card" : "premium-refer-card premium-refer-card--profile"}>
      <div className={isLoadingCard ? "loading-refer-chips" : "premium-refer-chips"} aria-hidden>
        <LobbyAssetImage
          src="/assets/lobby/chips-floating-3d.png"
          alt=""
          width={88}
          height={72}
          className="object-contain drop-shadow-[0_8px_24px_rgba(124,58,237,0.45)]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className={isLoadingCard ? "loading-card-label" : "premium-label"}>
          Invite friends
        </p>
        <p className={isLoadingCard ? "loading-refer-title" : "premium-refer-title"}>
          Earn rewards
        </p>
        <p className={isLoadingCard ? "loading-refer-sub" : "premium-refer-sub"}>
          Share your link — friends get a welcome bonus, you earn points for every signup. Play hands to stack more.
        </p>

        {data?.referralCode && authenticated && (
          <div className="premium-refer-code-row">
            <span className="premium-refer-code">{data.referralCode}</span>
            <span className="premium-refer-code-hint">
              +{REWARD_POINTS.REFERRAL_INVITE} pts · +{REWARD_POINTS.HAND_PLAYED} per hand
            </span>
          </div>
        )}

        {!ready ? null : !authenticated ? (
          <GuestInfoBox>Connect in the top bar to copy your invite link.</GuestInfoBox>
        ) : (
          <div className="premium-refer-actions">
            <button
              type="button"
              onClick={copyLink}
              disabled={!data?.referralLink || busy}
              className="premium-refer-btn"
            >
              {copied ? "Copied!" : "Copy invite link"}
            </button>
            {!isLoadingCard && (
              <Link href="/profile?tab=rewards" className="premium-refer-link">
                View points
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
