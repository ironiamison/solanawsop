"use client";

import Image from "next/image";
import GuestInfoBox from "@/components/ui/GuestInfoBox";
import type { ProfileTab } from "@/components/profile/ProfileTabs";

/** Same scenic plate as rewards — no baked-in UI mockups */
const GUEST_SCENE_BG = "/assets/lobby/rewards-guest-bg.png";

const GUEST_COPY: Record<
  ProfileTab | "default",
  { kicker: string; title: string; copy: string; hint: string }
> = {
  default: {
    kicker: "Player profile",
    title: "Your player profile",
    copy: "Manage rewards, friends, messages, and table invites — all synced globally.",
    hint: "Connect in the top bar to unlock your profile.",
  },
  overview: {
    kicker: "Player profile",
    title: "Your player profile",
    copy: "Manage rewards, friends, messages, and table invites — all synced globally.",
    hint: "Connect in the top bar to unlock your profile.",
  },
  rewards: {
    kicker: "Rewards · Season 1",
    title: "Your reward points",
    copy: "Earn points from hands played, referrals, and X verification — then redeem for perks.",
    hint: "Connect in the top bar to track and redeem points.",
  },
  friends: {
    kicker: "Friends",
    title: "Find your table crew",
    copy: "Search players by @handle, accept requests, and build your circle.",
    hint: "Connect in the top bar to add friends and accept requests.",
  },
  messages: {
    kicker: "Messages",
    title: "Your inbox",
    copy: "DM friends, coordinate buy-ins, and keep table talk in one place.",
    hint: "Connect in the top bar to open your inbox.",
  },
  invites: {
    kicker: "Private tables",
    title: "Table invites",
    copy: "Receive invite links and join friends at private SOL tables when they go live.",
    hint: "Connect in the top bar to view table invites.",
  },
  tables: {
    kicker: "Private tables",
    title: "Host private games",
    copy: "Create invite-only SOL tables with direct links — coming soon after on-chain deploy.",
    hint: "Connect in the top bar to host private tables.",
  },
};

export default function ProfileGuestGate({ tab }: { tab: ProfileTab }) {
  const config = GUEST_COPY[tab] ?? GUEST_COPY.default;

  return (
    <div className="profile-guest-stage">
      <Image
        src={GUEST_SCENE_BG}
        alt=""
        fill
        priority
        unoptimized
        className="profile-guest-stage-bg"
        sizes="100vw"
      />
      <div className="profile-guest-stage-vignette" aria-hidden />
      <div className="profile-guest-stage-glow" aria-hidden />

      <div className="profile-guest-stage-content">
        <div className="profile-guest-copy">
          <p className="profile-guest-kicker">{config.kicker}</p>
          <h1 className="profile-guest-title font-display">{config.title}</h1>
          <p className="profile-guest-desc">{config.copy}</p>
          <GuestInfoBox className="profile-guest-info">{config.hint}</GuestInfoBox>
        </div>
      </div>
    </div>
  );
}
