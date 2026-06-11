"use client";

import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import MiniTablePreview from "./MiniTablePreview";
import ChipStack from "./ChipStack";
import { formatWager } from "@/lib/constants";
import { GamePhase } from "@/lib/types";

function statusCopy(phase: GamePhase, playerCount: number): string {
  if (phase !== "waiting") return "Hand in progress";
  if (playerCount === 0) return "Empty — claim a seat";
  if (playerCount === 1) return "1 player waiting for you";
  if (playerCount < 6) return `${playerCount} seated — join now`;
  return "Table full";
}

export default function TableLobbyCard({
  label,
  tierIndex,
  pubkey,
  playerCount,
  phase,
  pot,
  featured,
}: {
  label: string;
  tierIndex: number;
  pubkey: PublicKey;
  playerCount: number;
  phase: GamePhase;
  pot: number;
  featured?: boolean;
}) {
  const inHand = phase !== "waiting";
  const stakes = label.replace(/ .+$/, "");

  return (
    <Link
      href={`/table/${pubkey.toBase58()}`}
      className={`table-lobby-card group block rounded-2xl p-4 sm:p-5 ${
        featured ? "table-lobby-card-featured" : ""
      }`}
    >
      {featured && (
        <span className="mb-2 inline-block rounded-full bg-[#e8c547]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#e8c547]">
          Most popular
        </span>
      )}

      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <ChipStack tierIndex={tierIndex} />
          <div>
            <p className="text-lg font-bold tabular-nums text-white">{stakes}</p>
            <p className="text-[11px] text-zinc-500">6-max · No limit</p>
          </div>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
            inHand
              ? "bg-emerald-500/15 text-emerald-400"
              : playerCount > 0
                ? "bg-[#e8c547]/15 text-[#e8c547]"
                : "bg-zinc-800 text-zinc-500"
          }`}
        >
          {playerCount}/6
        </span>
      </div>

      <MiniTablePreview
        playerCount={playerCount}
        inHand={inHand}
      />

      <p className="mt-3 text-center text-xs text-zinc-400">
        {statusCopy(phase, playerCount)}
      </p>

      {pot > 0 && (
        <p className="mt-1 text-center text-[11px] font-medium text-[#e8c547]">
          Pot {formatWager(pot)}
        </p>
      )}

      <div className="mt-4 flex justify-center">
        <span className="btn-deal opacity-90 transition group-hover:opacity-100 group-hover:scale-105">
          Take a seat
        </span>
      </div>
    </Link>
  );
}
