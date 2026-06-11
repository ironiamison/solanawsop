"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import NavIcon from "@/components/nav/NavIcon";
import BrandWordLockup from "@/components/brand/BrandWordLockup";
import { DASHBOARD_NAV, type DashboardNavItem } from "@/lib/dashboard-nav";
import { formatTokens, TOKEN_SYMBOL } from "@/lib/constants";

const GAME_NAV: DashboardNavItem[] = DASHBOARD_NAV;

export default function GameSidebarNav({ stack }: { stack: number; isDemo?: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const isActive = (item: DashboardNavItem) => {
    if (item.hash) return pathname === "/" && hash === item.hash;
    if (item.href.startsWith("/profile?tab=")) {
      const itemTab = item.href.split("tab=")[1];
      return pathname === "/profile" && tab === itemTab;
    }
    if (item.href === "/") return pathname === "/" && !hash;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <aside className="opoker-sidebar flex min-h-0 flex-col">
      <div className="sidebar-brand-header border-b border-white/[0.06]">
        <BrandWordLockup size="sm" href="/" priority className="sidebar-brand-lockup" />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {GAME_NAV.map((item) => {
          const active = isActive(item);
          const href = item.hash ? `${item.href}${item.hash}` : item.href;
          return (
            <Link
              key={item.label}
              href={href}
              className={`dashboard-nav-item w-full${active ? " dashboard-nav-item--active" : ""}`}
            >
              <span className="dashboard-nav-icon-slot" aria-hidden>
                <NavIcon name={item.icon} />
              </span>
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/[0.06] p-3">
        <div className="px-2 py-2">
          <p className="text-xs font-medium text-zinc-500">{TOKEN_SYMBOL} stack</p>
          <p className="mt-1 text-xl font-bold tabular-nums tracking-tight">
            {stack > 0 ? formatTokens(stack) : "—"}
          </p>
        </div>
      </div>
    </aside>
  );
}
