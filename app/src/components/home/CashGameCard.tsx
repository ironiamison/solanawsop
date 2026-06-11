"use client";

import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import TablePreview from "./TablePreview";
import { TOKEN_SYMBOL, BUY_IN_TIERS } from "@/lib/constants";
import { GamePhase } from "@/lib/types";
import { BtnBlockLabel, LiveDot } from "./lobby";

function formatStake(n: number): string {
  if (n >= 1_000_000) return `${n / 1_000_000}M`;
  if (n >= 1_000) return `${n / 1_000}K`;
  return String(n);
}

function tierBlinds(tierIndex: number): string {
  const bb = BUY_IN_TIERS[tierIndex].amount;
  return `${formatStake(bb / 2)} / ${formatStake(bb)}`;
}

export default function CashGameCard({
  tierIndex,
  label,
  pubkey,
  playerCount,
  phase,
}: {
  tierIndex: number;
  label: string;
  pubkey: PublicKey;
  phase: GamePhase;
  playerCount: number;
}) {
  const buyIn = label.replace(` ${TOKEN_SYMBOL}`, "");
  const blinds = tierBlinds(tierIndex);
  const isLive = phase !== "waiting";

  return (
    <Link
      href={`/table/${pubkey.toBase58()}`}
      className="lobby-table-card ui-card ui-card--hover group flex flex-col p-4"
    >
      <div className="relative overflow-hidden rounded-lg py-2">
        <TablePreview playerCount={playerCount} />
      </div>
      <div className="mt-4 flex-1 text-center">
        <p className="text-sm font-bold text-white">
          {blinds} {TOKEN_SYMBOL}
        </p>
        <p className="mt-1.5 flex items-center justify-center gap-2 text-xs text-zinc-500">
          <span className="inline-flex items-center gap-1.5 font-medium text-emerald-400">
            {isLive && <LiveDot />}
            {playerCount}/6
          </span>
          <span className="text-zinc-700">·</span>
          <span>NL Hold&apos;em</span>
        </p>
        <p className="mt-1 text-[11px] text-zinc-600">
          Buy-in {buyIn} {TOKEN_SYMBOL}
        </p>
      </div>
      <BtnBlockLabel className="mt-4">Join table</BtnBlockLabel>
    </Link>
  );
}
