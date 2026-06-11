"use client";

import { Suspense } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import ProfilePageHeader from "@/components/profile/ProfilePageHeader";
import ProfileSection from "@/components/profile/ProfileSection";
import MessagesPanel from "@/components/social/MessagesPanel";

export default function MessagesPage() {
  return (
    <DashboardShell>
      <ProfilePageHeader
        title="Messages"
        subtitle="DM friends to coordinate invites, buy-ins, and table talk."
      />
      <ProfileSection>
        <Suspense fallback={<p className="profile-empty">Loading inbox…</p>}>
          <MessagesPanel />
        </Suspense>
      </ProfileSection>
    </DashboardShell>
  );
}
