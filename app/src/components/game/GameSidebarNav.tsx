"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import BrandWordLockup from "@/components/brand/BrandWordLockup";
import { formatTokens, TOKEN_SYMBOL } from "@/lib/constants";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  hash?: string;
  match?: (pathname: string) => boolean;
};

const NAV: NavItem[] = [
  { href: "/", label: "Home", icon: "home" },
  {
    href: "/demo",
    label: "Play",
    icon: "play",
    match: (p) => p.startsWith("/demo") || p.startsWith("/table"),
  },
  { href: "/tournaments", label: "Tournaments", icon: "trophy" },
  { href: "/friends", label: "Friends", icon: "users" },
  { href: "/messages", label: "Messages", icon: "chat" },
  { href: "/leaderboard", label: "Leaderboard", icon: "chart" },
  { href: "/profile?tab=rewards", label: "Rewards", icon: "gift" },
  { href: "/profile", label: "Profile", icon: "user" },
];

function NavIcon({ name }: { name: string }) {
  const paths: Record<string, ReactNode> = {
    home: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    ),
    play: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
    trophy: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108 1.14 3.946 2.826 4.943M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0116.27 9.728M18.75 4.236V4.5c0 2.108-1.14 3.946-2.826 4.943m0 0a6.723 6.723 0 01-3.17.789 6.721 6.721 0 01-3.168-.789m3.168 0a6.721 6.721 0 003.168-.789" />
    ),
    chart: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    ),
    user: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    ),
    users: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    ),
    chat: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
    ),
    gift: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.25 2.25 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.25 2.25 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    ),
  };
  return (
    <svg className="h-[18px] w-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      {paths[name]}
    </svg>
  );
}

export default function GameSidebarNav({
  stack,
  isDemo = false,
}: {
  stack: number;
  isDemo?: boolean;
}) {
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

  const isActive = (item: NavItem) => {
    if (item.match) return item.match(pathname);
    if (item.href.startsWith("/profile?tab=")) {
      const itemTab = item.href.split("tab=")[1];
      return pathname === "/profile" && tab === itemTab;
    }
    if (item.hash) return pathname === "/" && hash === item.hash;
    if (item.href === "/") return pathname === "/" && !hash;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <aside className="opoker-sidebar flex min-h-0 flex-col">
      <div className="sidebar-brand-header border-b border-white/[0.06]">
        <BrandWordLockup size="md" href="/" priority className="sidebar-brand-lockup" />
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {NAV.map((item) => {
          const active = isActive(item);
          const href = item.hash ? `${item.href}${item.hash}` : item.href;
          return (
            <Link
              key={item.label}
              href={href}
              className={`opoker-nav-item ${active ? "opoker-nav-item-active" : ""}`}
            >
              <NavIcon name={item.icon} />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="opoker-balance-card m-3 shrink-0 rounded-xl p-4">
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-600">
          {isDemo ? "Play chips" : `${TOKEN_SYMBOL} balance`}
        </p>
        <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-white">
          {formatTokens(stack)}
        </p>
        <p className="mt-0.5 text-[11px] text-zinc-600">
          {isDemo ? "Practice stack" : "At this table"}
        </p>
      </div>
    </aside>
  );
}
