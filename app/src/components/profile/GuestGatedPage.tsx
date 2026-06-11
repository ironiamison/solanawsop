"use client";

import type { ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";
import DashboardShell from "@/components/layout/DashboardShell";
import ProfileGuestGate from "@/components/profile/ProfileGuestGate";
import type { ProfileTab } from "@/components/profile/ProfileTabs";

export function GuestGatedContent({
  tab,
  children,
}: {
  tab: ProfileTab;
  children: ReactNode;
}) {
  const { authenticated, ready } = usePrivy();

  if (!ready) {
    return <div className="profile-loading">Loading…</div>;
  }

  if (!authenticated) {
    return <ProfileGuestGate tab={tab} />;
  }

  return children;
}

/** Dashboard shell that shows the cinematic connect gate when wallet is not linked. */
export default function GuestGatedPage({
  tab,
  children,
}: {
  tab: ProfileTab;
  children: ReactNode;
}) {
  return (
    <DashboardShell>
      <GuestGatedContent tab={tab}>{children}</GuestGatedContent>
    </DashboardShell>
  );
}
