"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BUY_IN_TIERS,
  TOKEN_SYMBOL,
  WEEKLY_TOURNAMENT,
} from "@/lib/constants";
import { roomPda } from "@/lib/pdas";
import { formatCountdown, nextWeeklyTournamentStart } from "@/lib/tournament";

interface LeaderboardPlayer {
  rank: number;
  walletAddress: string | null;
  twitterHandle: string | null;
  name: string | null;
  handsPlayed: number;
  handsWon: number;
  winRate: number;
}

export default function LeaderboardSection() {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [countdown, setCountdown] = useState("");

  const tournamentTier = BUY_IN_TIERS[WEEKLY_TOURNAMENT.tierIndex];
  const [tournamentRoom] = roomPda(WEEKLY_TOURNAMENT.tierIndex);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const tick = () => {
      const start = nextWeeklyTournamentStart();
      setCountdown(formatCountdown(start.getTime() - Date.now()));
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="community" className="scroll-mt-24">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="game-badge mb-2 !text-[10px]">Compete</p>
          <h2 className="text-xl font-bold text-white">
            Tournament & leaderboard
          </h2>
        </div>
        <p className="text-xs text-zinc-600">Climb the ranks · season 1</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card overflow-hidden rounded-2xl">
          <div className="border-b border-white/[0.06] bg-[#e8c547]/[0.04] px-6 py-4">
            <div className="flex items-center justify-between">
              <span className="section-label">Weekly</span>
              <span className="text-xs tabular-nums text-zinc-500">
                {countdown}
              </span>
            </div>
          </div>
          <div className="p-6">
            <h3 className="font-display text-xl text-zinc-100">
              {WEEKLY_TOURNAMENT.title}
            </h3>
            <p className="mt-2 text-sm text-zinc-500">
              Fridays {WEEKLY_TOURNAMENT.hourUtc}:00 UTC ·{" "}
              {tournamentTier.label} buy-in
            </p>
            <Link
              href={`/table/${tournamentRoom.toBase58()}`}
              className="btn-gold mt-5 inline-flex"
            >
              Join table
            </Link>
          </div>
        </div>

        <div className="surface-card rounded-2xl p-6">
          <h3 className="section-label mb-4">Leaderboard</h3>
          {players.length === 0 ? (
            <p className="text-sm text-zinc-600">
              No hands yet — claim #1.
            </p>
          ) : (
            <ol className="space-y-1.5">
              {players.map((p) => (
                <li
                  key={p.walletAddress ?? p.rank}
                  className="flex items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-5 text-center text-xs font-bold ${
                        p.rank <= 3 ? "text-[#e8c547]" : "text-zinc-600"
                      }`}
                    >
                      {p.rank}
                    </span>
                    <span className="text-zinc-300">
                      {p.twitterHandle
                        ? `@${p.twitterHandle}`
                        : p.walletAddress
                          ? `${p.walletAddress.slice(0, 4)}…${p.walletAddress.slice(-4)}`
                          : "Player"}
                    </span>
                  </div>
                  <span className="text-xs tabular-nums text-zinc-600">
                    {p.handsWon}W · {p.winRate}%
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 text-[11px] text-zinc-700">
            {TOKEN_SYMBOL} season 1
          </p>
        </div>
      </div>
    </section>
  );
}
