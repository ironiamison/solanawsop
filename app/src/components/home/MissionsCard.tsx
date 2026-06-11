"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { TOKEN_SYMBOL } from "@/lib/constants";
import { LobbyCard, SectionTitle } from "./lobby";

const MISSIONS = [
  { id: "wins", title: "Win 3 hands", total: 3, reward: 15 },
  { id: "played", title: "Play 10 hands", total: 10, reward: 20 },
  { id: "pot", title: "Win a pot over 100K", total: 1, reward: 50 },
] as const;

function msUntilMidnightUtc(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

export default function MissionsCard() {
  const { authenticated, getAccessToken } = usePrivy();
  const [left, setLeft] = useState<number | null>(null);
  const [stats, setStats] = useState({ handsPlayed: 0, handsWon: 0 });

  useEffect(() => {
    const tick = () => setLeft(msUntilMidnightUtc());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

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

  const progress = (id: string) => {
    if (id === "wins") return Math.min(stats.handsWon, 3);
    if (id === "played") return Math.min(stats.handsPlayed, 10);
    return 0;
  };

  const h = left !== null ? Math.floor(left / 3_600_000) : null;
  const m = left !== null ? Math.floor((left % 3_600_000) / 60_000) : null;
  const s = left !== null ? Math.floor((left % 60_000) / 1000) : null;

  return (
    <LobbyCard id="missions" className="p-5" hover={false}>
      <SectionTitle
        action={
          <span className="font-mono text-[10px] tabular-nums text-zinc-600">
            {h !== null ? `${h}h ${m}m ${s}s` : "—"}
          </span>
        }
      >
        Daily missions
      </SectionTitle>
      {!authenticated ? (
        <p className="text-sm text-zinc-600">Connect wallet to track mission progress.</p>
      ) : (
        <ul className="space-y-4">
          {MISSIONS.map((mission) => {
            const p = progress(mission.id);
            return (
              <li key={mission.id}>
                <div className="mb-1.5 flex justify-between text-xs">
                  <span className="text-zinc-400">{mission.title}</span>
                  <span className="font-bold text-violet-400">
                    +{mission.reward} {TOKEN_SYMBOL}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800/80">
                  <div
                    className="lobby-mission-bar h-full rounded-full transition-all duration-500"
                    style={{ width: `${(p / mission.total) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] tabular-nums text-zinc-600">
                  {p}/{mission.total}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </LobbyCard>
  );
}
