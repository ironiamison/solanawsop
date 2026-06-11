export type NavIconName =
  | "home"
  | "play"
  | "trophy"
  | "users"
  | "chat"
  | "chart"
  | "gift"
  | "user";

export type DashboardNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: NavIconName;
  hash?: string;
  badgeKey?: "messages" | "friends" | "invites";
  /** Show in mobile bottom dock (max 5) */
  dock?: boolean;
  /** Show in desktop top bar */
  topBar?: boolean;
};

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { href: "/", label: "Home", shortLabel: "Home", icon: "home", dock: true, topBar: true },
  {
    href: "/",
    label: "Play",
    shortLabel: "Play",
    icon: "play",
    hash: "#cash-games",
    dock: true,
    topBar: true,
  },
  {
    href: "/tournaments",
    label: "Tournaments",
    shortLabel: "Events",
    icon: "trophy",
    dock: true,
    topBar: true,
  },
  { href: "/friends", label: "Friends", icon: "users", badgeKey: "friends", topBar: true },
  {
    href: "/messages",
    label: "Messages",
    shortLabel: "Inbox",
    icon: "chat",
    badgeKey: "messages",
    dock: true,
    topBar: true,
  },
  { href: "/leaderboard", label: "Leaderboard", icon: "chart", topBar: true },
  { href: "/profile?tab=rewards", label: "Rewards", icon: "gift", topBar: true },
  {
    href: "/profile",
    label: "Profile",
    shortLabel: "You",
    icon: "user",
    badgeKey: "invites",
    dock: true,
    topBar: true,
  },
];

/** Desktop top bar — keep it tight so labels stay readable */
export const TOP_BAR_NAV = DASHBOARD_NAV.filter((item) => item.topBar);

export const DOCK_NAV = DASHBOARD_NAV.filter((item) => item.dock);
