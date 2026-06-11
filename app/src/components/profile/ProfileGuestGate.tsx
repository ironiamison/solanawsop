"use client";

import Image from "next/image";
import BrandWordLockup from "@/components/brand/BrandWordLockup";
import LoginButton from "@/components/LoginButton";
import type { ProfileTab } from "@/components/profile/ProfileTabs";

/** Same scenic plate as rewards — no baked-in UI mockups */
const GUEST_SCENE_BG = "/assets/lobby/rewards-guest-bg.png";

const GUEST_COPY: Record<
  ProfileTab | "default",
  { pill: string; title: string; copy: string }
> = {
  default: {
    pill: "Player profile",
    title: "Your player profile",
    copy: "Connect to manage rewards, friends, messages, and table invites — all synced globally.",
  },
  overview: {
    pill: "Player profile",
    title: "Your player profile",
    copy: "Connect to manage rewards, friends, messages, and table invites — all synced globally.",
  },
  rewards: {
    pill: "Rewards · Season 1",
    title: "Your reward points",
    copy: "Connect to earn points from hands played, friend referrals, and X verification — then redeem for perks.",
  },
  friends: {
    pill: "Social · Friends",
    title: "Find friends",
    copy: "Connect to search players by @handle, accept requests, and build your table crew.",
  },
  messages: {
    pill: "Messages · Inbox",
    title: "Your messages",
    copy: "Connect your wallet to DM friends, coordinate buy-ins, and keep table talk in one place.",
  },
  invites: {
    pill: "Private tables",
    title: "Table invites",
    copy: "Connect to receive invite links and join friends at private SOL tables when they go live.",
  },
  tables: {
    pill: "Private tables",
    title: "Host private games",
    copy: "Connect to create invite-only SOL tables with direct links — coming soon after on-chain deploy.",
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
        <div className="profile-guest-stage-brand">
          <BrandWordLockup size="lg" priority showTagline />
        </div>

        <article className="profile-guest-stage-card">
          <div className="profile-guest-stage-card-shine" aria-hidden />
          <span className="profile-guest-stage-pill">{config.pill}</span>
          <h1 className="profile-guest-stage-title">{config.title}</h1>
          <p className="profile-guest-stage-copy">{config.copy}</p>
          <div className="profile-guest-stage-cta">
            <LoginButton variant="dashboard" />
          </div>
        </article>
      </div>
    </div>
  );
}
