"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandHeaderLogo from "@/components/brand/BrandHeaderLogo";
import LoginButton from "@/components/LoginButton";
import { usePrivyProfile } from "@/hooks/usePrivyProfile";
import { usePokerProgram } from "@/hooks/usePokerProgram";
import { useSocialCounts } from "@/hooks/useSocialCounts";
import { SOLANA_NETWORK, TOKEN_SYMBOL, BUY_IN_TIERS, WEEKLY_TOURNAMENT } from "@/lib/constants";
import { roomPda } from "@/lib/pdas";
import { LiveDot } from "./lobby";

const PAGE_TITLES: Record<string, string> = {
  "/": "Lobby",
  "/friends": "Friends",
  "/messages": "Messages",
  "/profile": "Profile",
  "/leaderboard": "Leaderboard",
  "/tournaments": "Tournaments",
  "/terms": "Terms",
  "/privacy": "Privacy",
};

export default function DashboardTopBar() {
  const pathname = usePathname();
  const profile = usePrivyProfile();
  const { authenticated } = usePokerProgram();
  const { counts } = useSocialCounts();
  const [tournamentRoom] = roomPda(WEEKLY_TOURNAMENT.tierIndex);
  const tier = BUY_IN_TIERS[WEEKLY_TOURNAMENT.tierIndex];

  const pageTitle = PAGE_TITLES[pathname] ?? "Lobby";
  const notifTotal =
    counts.unreadMessages + counts.pendingFriends + counts.tableInvites;

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#070709]/90 px-4 backdrop-blur-md lg:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <BrandHeaderLogo className="topbar-brand-lockup lg:hidden" priority />
        <div className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-[#0c0c10] px-3 py-1.5">
          <LiveDot />
          <span className="text-xs font-medium capitalize text-zinc-300">{SOLANA_NETWORK}</span>
        </div>
        {pathname !== "/" && (
          <h1 className="hidden truncate text-sm font-bold text-zinc-200 sm:block">{pageTitle}</h1>
        )}
      </div>

      <Link
        href={`/table/${tournamentRoom.toBase58()}`}
        className="lobby-champ-banner hidden min-w-0 flex-1 items-center justify-center gap-2.5 rounded-full px-4 py-2 md:flex"
      >
        <span className="truncate text-xs font-bold uppercase tracking-wide text-violet-100">
          {TOKEN_SYMBOL} Championship #241
        </span>
        <span className="hidden text-[11px] text-zinc-500 lg:inline">· {tier.label}</span>
        <span className="shrink-0 rounded-full bg-violet-600 px-3 py-0.5 text-[10px] font-bold text-white">
          View
        </span>
      </Link>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {authenticated && (
          <>
            <Link
              href="/friends"
              className="hidden h-9 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#0c0c10] px-3 text-[11px] font-semibold text-zinc-400 transition hover:border-violet-500/30 hover:text-violet-200 sm:flex"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0z" />
              </svg>
              Invite
            </Link>
            <Link
              href="/messages"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-300"
              aria-label="Messages"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              {counts.unreadMessages > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-600 px-1 text-[9px] font-bold">
                  {counts.unreadMessages > 9 ? "9+" : counts.unreadMessages}
                </span>
              )}
            </Link>
            <Link
              href="/profile?tab=invites"
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-300"
              aria-label="Notifications"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {notifTotal > 0 && (
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-amber-400" />
              )}
            </Link>
          </>
        )}

        {authenticated ? (
          <Link href="/profile" className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition hover:bg-white/[0.04]">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar}
                alt=""
                className="h-9 w-9 rounded-full object-cover ring-2 ring-violet-500/40"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-violet-600 to-violet-900 ring-2 ring-violet-500/30" />
            )}
            <span className="hidden max-w-[88px] truncate text-[11px] font-medium text-zinc-400 xl:inline">
              {profile.displayName ?? "Profile"}
            </span>
          </Link>
        ) : (
          <span className="hidden text-[11px] text-zinc-600 sm:inline">Not connected</span>
        )}
        <LoginButton variant="dashboard" />
      </div>
    </header>
  );
}
