"use client";

import { useEffect, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";
import { useCallback } from "react";
import { REFERRAL_STORAGE_KEY } from "@/lib/rewards";

export interface PrivyProfile {
  displayName: string;
  avatar?: string;
  twitterHandle?: string;
  walletAddress?: string;
  privyUserId?: string;
}

export function usePrivyProfile(): PrivyProfile {
  const { user, authenticated, getAccessToken } = usePrivy();
  const { wallets } = useWallets();

  const walletAddress = wallets[0]?.address;

  const twitterAccount = user?.linkedAccounts?.find(
    (a) => a.type === "twitter_oauth"
  );
  const twitterHandle =
    twitterAccount && "username" in twitterAccount
      ? twitterAccount.username
      : undefined;

  const displayName = useMemo(() => {
    if (twitterHandle) return `@${twitterHandle}`;
    if (user?.email?.address) return user.email.address;
    if (walletAddress) return `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`;
    return "Guest";
  }, [twitterHandle, user?.email?.address, walletAddress]);

  const syncProfile = useCallback(async () => {
    if (!authenticated || !user?.id) return null;
    try {
      const token = await getAccessToken();
      if (!token) return null;
      const referralCode =
        typeof window !== "undefined"
          ? localStorage.getItem(REFERRAL_STORAGE_KEY) ?? undefined
          : undefined;
      const res = await fetch("/api/profile/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ walletAddress, referralCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && referralCode) {
        localStorage.removeItem(REFERRAL_STORAGE_KEY);
      }
      if (res.ok && typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("wsop-profile-synced", {
            detail: data as { user?: { rewardPoints?: number } },
          })
        );
      }
      return res.ok ? data : null;
    } catch {
      return null;
    }
  }, [authenticated, getAccessToken, user?.id, walletAddress]);

  useEffect(() => {
    syncProfile();
  }, [syncProfile, twitterHandle]);

  return {
    displayName,
    avatar: user?.twitter?.profilePictureUrl ?? undefined,
    twitterHandle: twitterHandle ?? undefined,
    walletAddress: walletAddress ?? undefined,
    privyUserId: user?.id,
  };
}
