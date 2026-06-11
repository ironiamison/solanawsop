"use client";

import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import TokenContractAddress from "@/components/token/TokenContractAddress";
import {
  FEATURED_TIER_INDEX,
  PUMP_FUN_URL,
  TOKEN_SYMBOL,
} from "@/lib/constants";
import { roomPda } from "@/lib/pdas";

interface Props {
  onlinePlayers: number;
  activeTables: number;
  quickPlayPubkey?: PublicKey;
}

export default function GameLobbyHero({
  onlinePlayers,
  activeTables,
  quickPlayPubkey,
}: Props) {
  const [fallbackRoom] = roomPda(FEATURED_TIER_INDEX);
  const playTarget = quickPlayPubkey ?? fallbackRoom;

  return (
    <section className="game-hero relative mb-10 overflow-hidden rounded-3xl px-6 py-10 sm:px-10 sm:py-12">
      <div className="hero-cards pointer-events-none absolute inset-0 overflow-hidden">
        <div className="hero-card hero-card-1">A♠</div>
        <div className="hero-card hero-card-2">K♥</div>
        <div className="hero-card hero-card-3">Q♦</div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center lg:items-start lg:text-left">
        <p className="game-badge mb-4">Live cash games · 6-max Hold&apos;em</p>

        <h2 className="font-display mb-3 max-w-xl text-4xl leading-[1.05] text-white sm:text-5xl lg:text-[3.5rem]">
          Shuffle up.
          <br />
          <span className="text-gold-gradient italic">Deal me in.</span>
        </h2>

        <p className="mb-6 max-w-md text-sm text-zinc-400 sm:text-base">
          Pick a table, take your seat, and play real Texas Hold&apos;em against
          other players. Wager {TOKEN_SYMBOL} — win the pot.
        </p>

        <div className="mb-6 flex flex-wrap items-center justify-center gap-4 lg:justify-start">
          <Link href={`/table/${playTarget.toBase58()}`} className="btn-deal-lg">
            Quick play
          </Link>
          <a
            href={PUMP_FUN_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost"
          >
            Get {TOKEN_SYMBOL}
          </a>
        </div>

        <TokenContractAddress variant="hero" className="mb-6 justify-center lg:justify-start" />

        <div className="flex flex-wrap justify-center gap-6 text-sm lg:justify-start">
          <LiveStat label="Players online" value={onlinePlayers} pulse />
          <LiveStat label="Tables active" value={activeTables} />
          <LiveStat label="Game" value="NL Hold'em" />
        </div>
      </div>
    </section>
  );
}

function LiveStat({
  label,
  value,
  pulse,
}: {
  label: string;
  value: number | string;
  pulse?: boolean;
}) {
  return (
    <div className="text-left">
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-zinc-600">
        {pulse && (
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-emerald-400" />
        )}
        {label}
      </p>
      <p className="text-lg font-bold tabular-nums text-zinc-200">{value}</p>
    </div>
  );
}
