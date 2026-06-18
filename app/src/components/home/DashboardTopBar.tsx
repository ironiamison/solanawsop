"use client";

import Link from "next/link";
import BrandHeaderLogo from "@/components/brand/BrandHeaderLogo";
import LoginButton from "@/components/LoginButton";
import DashboardNavBar from "@/components/nav/DashboardNavBar";
import { usePrivyProfile } from "@/hooks/usePrivyProfile";
import { usePokerProgram } from "@/hooks/usePokerProgram";
import { SHOW_NETWORK_BADGE, SOLANA_NETWORK } from "@/lib/constants";
import { LiveDot } from "./lobby";
import TutorialLaunchButton from "@/components/tutorial/TutorialLaunchButton";

export default function DashboardTopBar() {
  const profile = usePrivyProfile();
  const { authenticated } = usePokerProgram();

  return (
    <header className="dash-topbar">
      <div className="dash-topbar-left">
        <BrandHeaderLogo className="topbar-brand-lockup shrink-0" priority />
        {SHOW_NETWORK_BADGE && (
          <div className="dash-topbar-network ui-pill ui-pill--live hidden xl:flex">
            <LiveDot />
            <span className="capitalize">{SOLANA_NETWORK}</span>
          </div>
        )}
      </div>

      <DashboardNavBar />

      <TutorialLaunchButton variant="pill" className="hidden sm:inline-flex" />

      <div className="dash-topbar-right">
        {authenticated ? (
          <Link href="/profile" className="dash-topbar-profile">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar} alt="" className="dash-topbar-avatar" />
            ) : (
              <div className="dash-topbar-avatar dash-topbar-avatar--fallback" />
            )}
            <span className="dash-topbar-profile-name hidden xl:inline">
              {profile.displayName ?? "Profile"}
            </span>
          </Link>
        ) : (
          <span className="dash-topbar-status hidden text-xs text-zinc-500 sm:inline">Not connected</span>
        )}
        <LoginButton variant="dashboard" />
      </div>
    </header>
  );
}
