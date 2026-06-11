"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { TOKEN_SYMBOL } from "@/lib/constants";
import GuestInfoBox from "@/components/ui/GuestInfoBox";
import { LobbyCard, SectionTitle } from "./lobby";

export default function PlayerStatsCard() {
  const { authenticated, getAccessToken } = usePrivy();
  const [stats, setStats] = useState({ handsPlayed: 0, handsWon: 0 });

  useEffect(() => {
    if (!authenticated) return;
    (async () => {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch("/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats({
          handsPlayed: data.user?.handsPlayed ?? 0,
          handsWon: data.user?.handsWon ?? 0,
        });
      }
    })();
  }, [authenticated, getAccessToken]);

  const winRate =
    stats.handsPlayed > 0 ? ((stats.handsWon / stats.handsPlayed) * 100).toFixed(1) : "0.0";
  const level = authenticated
    ? Math.min(99, 1 + stats.handsWon * 2 + Math.floor(stats.handsPlayed / 5))
    : 1;
  const pct = Math.min(100, (level / 99) * 100);

  return (
    <LobbyCard className="p-5" hover={false}>
      <SectionTitle>Your stats</SectionTitle>
      {!authenticated ? (
        <GuestInfoBox>Connect in the top bar to track session stats.</GuestInfoBox>
      ) : (
        <>
          <div className="flex gap-5">
            <div className="relative h-[88px] w-[88px] shrink-0">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="14"
                  fill="none"
                  stroke="#8b5cf6"
                  strokeWidth="2.5"
                  strokeDasharray={`${(pct / 100) * 88} 88`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[9px] font-medium uppercase text-zinc-600">Level</span>
                <span className="text-xl font-black text-violet-300">{level}</span>
              </div>
            </div>
            <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-3 text-sm">
              <div>
                <dt className="text-[10px] text-zinc-600">Hands played</dt>
                <dd className="font-bold tabular-nums">{stats.handsPlayed.toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-[10px] text-zinc-600">Hands won</dt>
                <dd className="font-bold tabular-nums text-emerald-400">
                  {stats.handsWon.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] text-zinc-600">Win rate</dt>
                <dd className="font-bold tabular-nums text-violet-300">{winRate}%</dd>
              </div>
              <div>
                <dt className="text-[10px] text-zinc-600">Token</dt>
                <dd className="text-xs text-zinc-500">{TOKEN_SYMBOL}</dd>
              </div>
            </dl>
          </div>
          <Link href="/profile" className="ui-btn ui-btn--ghost ui-btn--block mt-4">
            View profile
          </Link>
        </>
      )}
    </LobbyCard>
  );
}
