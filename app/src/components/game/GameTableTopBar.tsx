"use client";

import Link from "next/link";
import BrandChipMark from "@/components/brand/BrandChipMark";
import { SOLANA_NETWORK } from "@/lib/constants";

export default function GameTableTopBar({
  tableTitle,
  blindsLabel,
  buyInLabel,
  playerCount,
  maxPlayers,
  userLabel,
  userAvatar,
}: {
  tableTitle: string;
  blindsLabel: string;
  buyInLabel: string;
  playerCount: number;
  maxPlayers: number;
  userLabel: string;
  userAvatar?: string;
}) {
  return (
    <header className="opoker-topbar flex h-[52px] shrink-0 items-center gap-3 border-b border-white/[0.06] px-3 sm:px-4">
      <Link href="/" className="opoker-topbar-logo shrink-0" aria-label="Back to lobby">
        <BrandChipMark variant="icon" size="sm" />
      </Link>

      <div className="opoker-topbar-pill mx-auto flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-4 py-1.5 sm:px-5 sm:py-2">
        <div className="min-w-0 text-center">
          <p className="truncate text-[11px] font-bold uppercase tracking-wide text-violet-200">
            {tableTitle}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-2.5 text-[10px] text-zinc-500">
            <span>Blinds {blindsLabel}</span>
            <span className="text-zinc-700">·</span>
            <span className="inline-flex items-center gap-1">
              <svg className="h-3 w-3 text-zinc-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v1H3a1 1 0 00-1 1v7a1 1 0 001 1h14a1 1 0 001-1v-7a1 1 0 00-1-1h-1V8a6 6 0 00-6-6z" />
              </svg>
              {playerCount}/{maxPlayers}
            </span>
            <span className="text-zinc-700">·</span>
            <span>Buy-in {buyInLabel}</span>
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="opoker-network-btn hidden items-center gap-1.5 sm:flex"
        >
          <span className="opoker-network-dot" />
          {SOLANA_NETWORK}
        </button>

        <div className="opoker-wallet-chip flex items-center gap-1.5 py-1 pl-1 pr-2.5">
          {userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userAvatar} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-violet-900 text-[10px] font-bold text-white">
              {userLabel.charAt(0).toUpperCase()}
            </div>
          )}
          <span className="max-w-[90px] truncate font-mono text-[10px] text-zinc-300">
            {userLabel}
          </span>
        </div>

        <Link href="/profile" className="opoker-icon-btn" aria-label="Profile">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </Link>
        <Link href="/" className="opoker-icon-btn" aria-label="Exit table">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
