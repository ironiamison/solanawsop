"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useLinkTwitter } from "@/hooks/useLinkTwitter";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import { GuestGatedContent } from "@/components/profile/GuestGatedPage";
import { BtnSecondary } from "@/components/home/lobby";
import FriendsPanel from "@/components/social/FriendsPanel";
import MessagesPanel from "@/components/social/MessagesPanel";
import InvitesPanel from "@/components/social/InvitesPanel";
import ProfileHero from "@/components/profile/ProfileHero";
import ProfileSection from "@/components/profile/ProfileSection";
import ProfileTabs, { type ProfileTab } from "@/components/profile/ProfileTabs";
import PrivateTablePanel from "@/components/profile/PrivateTablePanel";
import WsopPrivateTablePanel from "@/components/profile/WsopPrivateTablePanel";
import BotPracticePanel from "@/components/profile/BotPracticePanel";
import { TOKEN_SYMBOL } from "@/lib/constants";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { usePrivyProfile } from "@/hooks/usePrivyProfile";
import { useSocialCounts } from "@/hooks/useSocialCounts";
import RewardsPanel from "@/components/rewards/RewardsPanel";

function ProfileContent() {
  const { user, authenticated, ready } = usePrivy();
  const { connectTwitter, linking: linkingTwitter, error: twitterLinkError } = useLinkTwitter();
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

  const loadDbProfile = useCallback(() => {
    if (!authenticated) return;
    authFetch("/api/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.user) {
          setDbProfile(d.user);
          if (d.user.bio) setBio(d.user.bio);
        }
      })
      .catch(() => {});
  }, [authenticated, authFetch]);

  useEffect(() => {
    loadDbProfile();
  }, [loadDbProfile, tab, twitterHandle]);

  useEffect(() => {
    const onSynced = (e: Event) => {
      const detail = (e as CustomEvent<{ user?: typeof dbProfile }>).detail;
      if (detail?.user) {
        setDbProfile(detail.user);
      } else {
        loadDbProfile();
      }
    };
    window.addEventListener("wsop-profile-synced", onSynced);
    return () => window.removeEventListener("wsop-profile-synced", onSynced);
  }, [loadDbProfile]);

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

  return (
    <GuestGatedContent tab={tab}>
    <div className="profile-page">
      <ProfileHero
        profile={heroProfile}
        onLinkTwitter={connectTwitter}
        linkingTwitter={linkingTwitter}
        twitterLinkError={twitterLinkError}
      />

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
                hint={`SOL + ${TOKEN_SYMBOL}`}
              />
              <QuickLink
                href="/profile/practice"
                label="Test your strategy"
                hint="Play vs bots"
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
        <div className="profile-tables-stack flex flex-col gap-8" data-tour="private-tables">
          <ProfileSection
            title="Private tables · SOL"
            subtitle="On-chain invite-only games with real SOL buy-ins"
          >
            <PrivateTablePanel />
          </ProfileSection>
          <ProfileSection
            title={`Private tables · ${TOKEN_SYMBOL}`}
            subtitle="Invite-only token tables — live now with play chips"
          >
            <WsopPrivateTablePanel />
          </ProfileSection>
          <ProfileSection
            title="Test your strategy"
            subtitle="Profile-only bot table — sharpen your game in private"
          >
            <BotPracticePanel />
          </ProfileSection>
        </div>
      )}

      {tab === "rewards" && (
        <RewardsPanel
          rewardPoints={dbProfile?.rewardPoints ?? 0}
          playRewardPoints={dbProfile?.playRewardPoints ?? 0}
          referralRewardPoints={dbProfile?.referralRewardPoints ?? 0}
          referralsCount={dbProfile?.referralsCount ?? 0}
          handsPlayed={dbProfile?.handsPlayed ?? 0}
          twitterHandle={twitterHandle}
          onLinkTwitter={connectTwitter}
          linkingTwitter={linkingTwitter}
          twitterLinkError={twitterLinkError}
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
    </GuestGatedContent>
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
