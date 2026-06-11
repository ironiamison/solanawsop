"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import LoginButton from "@/components/LoginButton";
import BrandChipMark from "@/components/brand/BrandChipMark";
import { BtnSecondary } from "@/components/home/lobby";
import FriendsPanel from "@/components/social/FriendsPanel";
import MessagesPanel from "@/components/social/MessagesPanel";
import InvitesPanel from "@/components/social/InvitesPanel";
import ProfileHero from "@/components/profile/ProfileHero";
import ProfileSection from "@/components/profile/ProfileSection";
import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";
import PrivateTablePanel from "@/components/profile/PrivateTablePanel";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { usePrivyProfile } from "@/hooks/usePrivyProfile";
import { useSocialCounts } from "@/hooks/useSocialCounts";
import RewardsPanel from "@/components/rewards/RewardsPanel";

function ProfileContent() {
  const { user, authenticated, ready, linkTwitter } = usePrivy();
  const privyProfile = usePrivyProfile();
  const authFetch = useAuthFetch();
  const { counts } = useSocialCounts();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as ProfileTab | null;
  const [tab, setTab] = useState<ProfileTab>(tabParam ?? "overview");
  const [bio, setBio] = useState("");
  const [dbProfile, setDbProfile] = useState<{
    handsPlayed?: number;
    handsWon?: number;
    bio?: string | null;
    rewardPoints?: number;
    playRewardPoints?: number;
    referralRewardPoints?: number;
    referralsCount?: number;
    walletAddress?: string | null;
  } | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const twitterHandle = privyProfile.twitterHandle ?? null;

  useEffect(() => {
    if (tabParam && ["overview", "rewards", "friends", "messages", "invites", "tables"].includes(tabParam)) {
      setTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (!authenticated) return;
    authFetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setDbProfile(d.user);
          if (d.user.bio) setBio(d.user.bio);
        }
      });
  }, [authenticated, authFetch, tab]);

  const saveBio = async () => {
    setStatus("Saving…");
    const res = await authFetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bio }),
    });
    setStatus(res.ok ? "Saved" : "Failed");
  };

  const setTabAndUrl = (next: ProfileTab) => {
    setTab(next);
    router.replace(next === "overview" ? "/profile" : `/profile?tab=${next}`, {
      scroll: false,
    });
  };

  const heroProfile = useMemo(
    () => ({
      displayName: user?.twitter?.name ?? privyProfile.displayName,
      twitterHandle,
      avatar: user?.twitter?.profilePictureUrl ?? privyProfile.avatar,
      walletAddress: dbProfile?.walletAddress ?? privyProfile.walletAddress,
      rewardPoints: dbProfile?.rewardPoints,
      handsWon: dbProfile?.handsWon,
      handsPlayed: dbProfile?.handsPlayed,
      referralsCount: dbProfile?.referralsCount,
    }),
    [user, privyProfile, twitterHandle, dbProfile]
  );

  if (!ready) {
    return <div className="profile-loading">Loading profile…</div>;
  }

  if (!authenticated) {
    return (
      <div className="profile-guest">
        <div className="profile-guest-card">
          <div className="profile-guest-brand">
            <BrandChipMark variant="lockup" size="md" />
          </div>
          <p className="profile-guest-title">Your player profile</p>
          <p className="profile-guest-copy">
            Connect to manage rewards, friends, messages, and table invites — all synced globally.
          </p>
          <LoginButton variant="dashboard" />
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <ProfileHero profile={heroProfile} onLinkTwitter={linkTwitter} />

      <ProfileTabs active={tab} onChange={setTabAndUrl} />

      {tab === "overview" && (
        <div className="profile-overview-grid">
          <ProfileSection title="About you" subtitle="Visible to friends at the table">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell the table who you are — style, stakes, timezone…"
              rows={5}
              className="profile-textarea"
            />
            <div className="mt-3 flex items-center gap-3">
              <BtnSecondary onClick={saveBio}>Save bio</BtnSecondary>
              {status && <span className="profile-save-status">{status}</span>}
            </div>
          </ProfileSection>

          <ProfileSection title="Quick links">
            <ul className="profile-quick-links">
              <QuickLink
                href="/profile?tab=rewards"
                label="Rewards"
                hint={`${(dbProfile?.rewardPoints ?? 0).toLocaleString()} pts`}
              />
              <QuickLink
                href="/profile?tab=friends"
                label="Friends"
                hint={
                  counts.pendingFriends > 0
                    ? `${counts.pendingFriends} pending`
                    : "Find by @handle"
                }
                badge={counts.pendingFriends}
              />
              <QuickLink
                href="/profile?tab=messages"
                label="Messages"
                hint="DM friends"
                badge={counts.unreadMessages}
              />
              <QuickLink
                href="/profile?tab=tables"
                label="Private tables"
                hint="SOL · Coming soon"
              />
              <QuickLink
                href="/profile?tab=invites"
                label="Table invites"
                hint="Join private games"
                badge={counts.tableInvites}
              />
              <QuickLink href="/leaderboard" label="Leaderboard" hint="Global ranks" />
            </ul>
          </ProfileSection>

          <ProfileSection
            title="Friends"
            subtitle="Recently connected players"
            action={
              <Link href="/profile?tab=friends" className="profile-section-link">
                View all →
              </Link>
            }
            className="profile-overview-friends"
          >
            <FriendsPanel compact />
          </ProfileSection>
        </div>
      )}

      {tab === "tables" && (
        <ProfileSection
          title="Private tables"
          subtitle="Invite-only SOL games — coming soon"
        >
          <PrivateTablePanel />
        </ProfileSection>
      )}

      {tab === "rewards" && (
        <RewardsPanel
          rewardPoints={dbProfile?.rewardPoints ?? 0}
          playRewardPoints={dbProfile?.playRewardPoints ?? 0}
          referralRewardPoints={dbProfile?.referralRewardPoints ?? 0}
          referralsCount={dbProfile?.referralsCount ?? 0}
          handsPlayed={dbProfile?.handsPlayed ?? 0}
          twitterHandle={twitterHandle}
          onLinkTwitter={linkTwitter}
          onPointsChange={(pts) => setDbProfile((p) => (p ? { ...p, rewardPoints: pts } : p))}
        />
      )}

      {tab === "friends" && (
        <ProfileSection title="Friends" subtitle="Search by X handle or wallet address">
          <FriendsPanel />
        </ProfileSection>
      )}

      {tab === "messages" && (
        <ProfileSection title="Messages" subtitle="Direct messages with friends">
          <Suspense fallback={<p className="text-zinc-600">Loading inbox…</p>}>
            <MessagesPanel />
          </Suspense>
        </ProfileSection>
      )}

      {tab === "invites" && (
        <ProfileSection title="Table invites" subtitle="Private SOL invites — coming soon">
          <InvitesPanel />
        </ProfileSection>
      )}
    </div>
  );
}

function QuickLink({
  href,
  label,
  hint,
  badge,
}: {
  href: string;
  label: string;
  hint: string;
  badge?: number;
}) {
  return (
    <li>
      <Link href={href} className="profile-quick-link">
        <div>
          <p className="profile-quick-link-label">{label}</p>
          <p className="profile-quick-link-hint">{hint}</p>
        </div>
        {badge && badge > 0 ? (
          <span className="profile-quick-link-badge">{badge > 9 ? "9+" : badge}</span>
        ) : (
          <span className="profile-quick-link-arrow">→</span>
        )}
      </Link>
    </li>
  );
}

export default function ProfilePage() {
  return (
    <DashboardShell>
      <Suspense fallback={<div className="profile-loading">Loading…</div>}>
        <ProfileContent />
      </Suspense>
    </DashboardShell>
  );
}
