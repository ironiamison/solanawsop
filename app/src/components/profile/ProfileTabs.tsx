"use client";

import { useSocialCounts } from "@/hooks/useSocialCounts";

export type ProfileTab = "overview" | "rewards" | "friends" | "messages" | "invites" | "tables";

const TABS: {
  id: ProfileTab;
  label: string;
  badgeKey?: keyof ReturnType<typeof useSocialCounts>["counts"];
  comingSoon?: boolean;
}[] = [
  { id: "overview", label: "Overview" },
  { id: "tables", label: "Private tables", comingSoon: true },
  { id: "rewards", label: "Rewards" },
  { id: "friends", label: "Friends", badgeKey: "pendingFriends" },
  { id: "messages", label: "Messages", badgeKey: "unreadMessages" },
  { id: "invites", label: "Invites", badgeKey: "tableInvites" },
];

export default function ProfileTabs({
  active,
  onChange,
}: {
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
}) {
  const { counts } = useSocialCounts();

  return (
    <nav className="profile-tab-bar" aria-label="Profile sections">
      {TABS.map((t) => {
        const badge = t.badgeKey ? counts[t.badgeKey] : 0;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`profile-tab${active === t.id ? " profile-tab-active" : ""}`}
          >
            {t.label}
            {t.comingSoon && (
              <span className="profile-tab-soon">Soon</span>
            )}
            {badge > 0 && (
              <span className="profile-tab-badge">{badge > 9 ? "9+" : badge}</span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
