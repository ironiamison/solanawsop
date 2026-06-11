"use client";

import Link from "next/link";
import { Suspense } from "react";
import { DOCK_NAV } from "@/lib/dashboard-nav";
import { useDashboardNav } from "@/hooks/useDashboardNav";
import { useSocialCounts } from "@/hooks/useSocialCounts";
import NavIcon from "./NavIcon";

function dockBadge(
  item: (typeof DOCK_NAV)[number],
  counts: ReturnType<typeof useSocialCounts>["counts"]
): number {
  if (item.badgeKey === "messages") return counts.unreadMessages;
  if (item.badgeKey === "friends") return counts.pendingFriends;
  if (item.badgeKey === "invites") return counts.tableInvites;
  return 0;
}

function DockInner() {
  const { isActive, hrefFor } = useDashboardNav();
  const { counts } = useSocialCounts();

  return (
    <nav className="dash-dock lg:hidden" aria-label="Main">
      <div className="dash-dock-track">
        {DOCK_NAV.map((item) => {
          const active = isActive(item);
          const badge = dockBadge(item, counts);
          return (
            <Link
              key={item.label}
              href={hrefFor(item)}
              className={`dash-dock-link${active ? " dash-dock-link--active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="dash-dock-icon">
                <NavIcon name={item.icon} className="h-[1.125rem] w-[1.125rem]" />
                {badge > 0 && (
                  <span className="dash-dock-badge">{badge > 9 ? "9+" : badge}</span>
                )}
              </span>
              <span className="dash-dock-label">{item.shortLabel ?? item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function DashboardMobileDock() {
  return (
    <Suspense fallback={null}>
      <DockInner />
    </Suspense>
  );
}
