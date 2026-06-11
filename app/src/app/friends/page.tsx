"use client";

import { Suspense } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import ProfilePageHeader from "@/components/profile/ProfilePageHeader";
import ProfileSection from "@/components/profile/ProfileSection";
import FriendsPanel from "@/components/social/FriendsPanel";

export default function FriendsPage() {
  return (
    <DashboardShell>
      <ProfilePageHeader
        title="Friends"
        subtitle="Add players by X handle or wallet, accept requests, and jump into DMs."
      />
      <ProfileSection>
        <FriendsPanel />
      </ProfileSection>
    </DashboardShell>
  );
}
