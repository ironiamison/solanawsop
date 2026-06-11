"use client";

import Link from "next/link";
import { usePrivyProfile } from "@/hooks/usePrivyProfile";
import { usePokerProgram } from "@/hooks/usePokerProgram";
import { formatWager, TOKEN_SYMBOL, SOLANA_NETWORK } from "@/lib/constants";

export default function GameTableHeader({
  buyIn,
  playerCount,
}: {
  buyIn: number;
  playerCount: number;
}) {
  const profile = usePrivyProfile();
  const { walletAddress } = usePokerProgram();

  return (
    <header className="game-table-header flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] px-4">
      <Link href="/" className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm">
          ♠
        </span>
        <div>
          <p className="text-sm font-bold text-white">
            {TOKEN_SYMBOL} <span className="text-violet-400">Poker</span>
          </p>
          <p className="text-[9px] uppercase tracking-widest text-zinc-600">
            On chain · real game
          </p>
        </div>
      </Link>

      <div className="hidden rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-center sm:block">
        <p className="text-[10px] font-bold uppercase tracking-wider text-violet-300">
          Cash game · 6-max
        </p>
        <p className="text-[10px] text-zinc-500">
          {formatWager(buyIn)} · {playerCount}/6 seated
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-[10px] text-zinc-400 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {SOLANA_NETWORK}
        </span>
        <div className="flex items-center gap-2 rounded-lg border border-violet-500/25 bg-violet-500/10 px-2.5 py-1.5">
          {profile.avatar && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar}
              alt=""
              className="h-7 w-7 rounded-full ring-2 ring-violet-500/50"
            />
          )}
          <span className="max-w-[80px] truncate font-mono text-[11px] text-zinc-300 sm:max-w-none">
            {profile.twitterHandle
              ? `@${profile.twitterHandle}`
              : walletAddress
                ? `${walletAddress.slice(0, 4)}…${walletAddress.slice(-4)}`
                : "Guest"}
          </span>
        </div>
      </div>
    </header>
  );
}
