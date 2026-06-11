"use client";

import Link from "next/link";
import { DASHBOARD_NAV, type DashboardNavItem } from "@/lib/dashboard-nav";
import { useDashboardNav } from "@/hooks/useDashboardNav";
import { useSocialCounts } from "@/hooks/useSocialCounts";
import NavIcon from "./NavIcon";

function badgeFor(
  key: DashboardNavItem["badgeKey"],
  counts: ReturnType<typeof useSocialCounts>["counts"]
): number {
  if (!key) return 0;
  if (key === "messages") return counts.unreadMessages;
  if (key === "friends") return counts.pendingFriends;
  return counts.tableInvites;
}

export default function DashboardNavLinks() {
  const { isActive, hrefFor } = useDashboardNav();
  const { counts } = useSocialCounts();

  return (
    <nav className="dash-nav" aria-label="Main">
      <ul className="dash-nav-list">
        {DASHBOARD_NAV.map((item) => {
          const active = isActive(item);
          const badge = badgeFor(item.badgeKey, counts);
          return (
            <li key={item.label}>
              <Link
                href={hrefFor(item)}
                className={`dash-nav-link${active ? " dash-nav-link--active" : ""}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="dash-nav-link-icon" aria-hidden>
                  <NavIcon name={item.icon} className="h-4 w-4" />
                </span>
                <span className="dash-nav-link-label">{item.label}</span>
                {badge > 0 && (
                  <span className="dash-nav-link-badge">{badge > 9 ? "9+" : badge}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
