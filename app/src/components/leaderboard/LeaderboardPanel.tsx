"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { TOKEN_SYMBOL } from "@/lib/constants";
import { LobbyCard, SectionTitle } from "@/components/home/lobby";

export interface LeaderboardPlayer {
  rank: number;
  id?: string;
  twitterHandle: string | null;
  walletAddress: string | null;
  name?: string | null;
  handsWon: number;
  handsPlayed?: number;
  rewardPoints?: number;
  image?: string | null;
}

const SORTS = [
  { id: "wins" as const, label: "Wins" },
  { id: "points" as const, label: "Points" },
];

const AVATARS = ["#8b5cf6", "#ec4899", "#3b82f6", "#22c55e", "#f59e0b"];

export default function LeaderboardPanel({
  limit = 10,
  compact = false,
  showViewAll = false,
}: {
  limit?: number;
  compact?: boolean;
  showViewAll?: boolean;
}) {
  const [players, setPlayers] = useState<LeaderboardPlayer[]>([]);
  const [sort, setSort] = useState<"wins" | "points">("wins");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/leaderboard?sort=${sort}&limit=${limit}`)
      .then((r) => r.json())
      .then((d) => setPlayers(d.players ?? []))
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, [sort, limit]);

  return (
    <LobbyCard id={compact ? "leaderboard" : undefined} className="p-5" hover={false}>
      <SectionTitle
        action={
          <div className="flex rounded-lg bg-black/40 p-0.5">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={`rounded-md px-2.5 py-0.5 text-[9px] font-bold uppercase transition ${
                  sort === s.id
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-zinc-600 hover:text-zinc-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        }
      >
        Global leaderboard
      </SectionTitle>

      <p className="-mt-2 mb-3 text-[10px] text-zinc-600">
        Same rankings everywhere — home, profile, and tables share one global board.
      </p>

      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-600">Loading…</p>
      ) : players.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-600">
          No rankings yet. Play hands and earn points to climb.
        </p>
      ) : (
        <ol className="space-y-0.5">
          {players.map((p, i) => (
            <li
              key={`${p.rank}-${p.twitterHandle ?? p.walletAddress ?? i}`}
              className="flex items-center justify-between rounded-lg px-2 py-2 transition hover:bg-white/[0.02]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className={`w-4 text-center text-xs font-black ${
                    p.rank === 1
                      ? "text-amber-400"
                      : p.rank <= 3
                        ? "text-violet-400"
                        : "text-zinc-600"
                  }`}
                >
                  {p.rank}
                </span>
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.image}
                    alt=""
                    className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <div
                    className="h-7 w-7 rounded-full ring-1 ring-white/10"
                    style={{ background: AVATARS[i % AVATARS.length] }}
                  />
                )}
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-zinc-300">
                    {p.twitterHandle
                      ? `@${p.twitterHandle}`
                      : p.walletAddress
                        ? `${p.walletAddress.slice(0, 6)}…`
                        : p.name ?? "Player"}
                  </p>
                  {p.twitterHandle && p.name && (
                    <p className="truncate text-[10px] text-zinc-600">{p.name}</p>
                  )}
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-semibold tabular-nums text-emerald-400">
                {sort === "points"
                  ? `${(p.rewardPoints ?? 0).toLocaleString()} pts`
                  : `${p.handsWon}W`}
              </span>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-[9px] text-zinc-700">{TOKEN_SYMBOL} · season 1 · live data</p>
        {showViewAll && (
          <Link href="/leaderboard" className="text-[10px] font-semibold text-violet-400">
            View all →
          </Link>
        )}
      </div>
    </LobbyCard>
  );
}
