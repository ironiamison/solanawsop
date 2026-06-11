"use client";

import { Suspense } from "react";
import GuestGatedPage from "@/components/profile/GuestGatedPage";
import ProfilePageHeader from "@/components/profile/ProfilePageHeader";
import ProfileSection from "@/components/profile/ProfileSection";
import MessagesPanel from "@/components/social/MessagesPanel";

export default function MessagesPage() {
  return (
    <GuestGatedPage tab="messages">
      <ProfilePageHeader
        title="Messages"
        subtitle="DM friends to coordinate invites, buy-ins, and table talk."
      />
      <ProfileSection>
        <Suspense fallback={<p className="profile-empty">Loading inbox…</p>}>
          <MessagesPanel />
        </Suspense>
      </ProfileSection>
    </GuestGatedPage>
  );
}
