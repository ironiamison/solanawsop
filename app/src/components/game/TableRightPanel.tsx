"use client";

import Link from "next/link";
import { phaseLabel } from "@/lib/cards";
import { explorerTxUrl, formatTokens, TOKEN_SYMBOL } from "@/lib/constants";
import { GamePhase } from "@/lib/types";
import PlayerAvatar from "@/components/social/PlayerAvatar";

const MISSIONS = [
  { title: "Win 3 hands", progress: 2, total: 3, reward: 15 },
  { title: "Play 10 hands", progress: 7, total: 10, reward: 20 },
];

export default function TableRightPanel({
  phase,
  roomPubkey,
  lastTxSig,
  spectatorCount = 0,
  spectatorNames = [],
  variant = "live",
  seatedPlayers = [],
}: {
  phase: GamePhase;
  roomPubkey: string;
  lastTxSig?: string | null;
  playerCount?: number;
  spectatorCount?: number;
  spectatorNames?: string[];
  variant?: "live" | "demo";
  seatedPlayers?: { name: string; stack: number; avatar?: string }[];
}) {
  const streets: GamePhase[] = ["preFlop", "flop", "turn", "river"];
  const activeIdx = streets.indexOf(phase);

  return (
    <aside className="opoker-right-panel flex h-full min-h-0 flex-col gap-2 overflow-y-auto p-2.5">
      <div className="opoker-panel-card p-3">
        <h3 className="opoker-panel-title">Hand history</h3>
        <ul className="space-y-2 text-[11px]">
          {streets.map((s, i) => (
            <li
              key={s}
              className={`flex items-center justify-between ${
                i <= activeIdx && phase !== "waiting" ? "text-violet-200" : "text-zinc-600"
              }`}
            >
              <span>{phaseLabel(s)}</span>
              {i === activeIdx && phase !== "waiting" && (
                <span className="text-[8px] font-bold uppercase text-emerald-400">Live</span>
              )}
            </li>
          ))}
          {phase === "showdown" && (
            <li className="font-semibold text-amber-300">Showdown</li>
          )}
          {phase === "waiting" && (
            <li className="text-zinc-600">Waiting to deal…</li>
          )}
        </ul>
      </div>

      <div className="opoker-panel-card opoker-panel-card-accent p-3">
        <h3 className="opoker-panel-title text-violet-400">
          {variant === "demo" ? "Free play" : "On-chain"}
        </h3>
        {variant === "demo" ? (
          <>
            <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">Table</p>
            <p className="mb-2 font-mono text-[10px] text-zinc-400">Demo · shared room</p>
            <p className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Practice chips · no wallet
            </p>
          </>
        ) : (
          <>
            <p className="text-[9px] leading-relaxed text-zinc-500">
              Street tracker for the current hand. Escrow & tx links are in the Verify panel above.
            </p>
            {lastTxSig && (
              <a
                href={explorerTxUrl(lastTxSig)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-[10px] font-semibold text-violet-400 hover:underline"
              >
                View tx →
              </a>
            )}
          </>
        )}
      </div>

      <div className="opoker-panel-card p-3">
        <h3 className="opoker-panel-title">Spectators</h3>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          {(spectatorNames.length > 0
            ? spectatorNames.slice(0, 8)
            : []
          ).map((name, i) => (
            <div key={`${name}-${i}`} title={name} className="ring-2 ring-[#08060e] rounded-full">
              <PlayerAvatar seed={name} name={name} size="sm" />
            </div>
          ))}
          {spectatorCount > 8 && (
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-bold text-zinc-400 ring-2 ring-[#08060e]">
              +{spectatorCount - 8}
            </div>
          )}
          {spectatorCount === 0 && (
            <p className="text-2xl font-bold tabular-nums text-zinc-500">0</p>
          )}
        </div>
      </div>

      {seatedPlayers.length > 0 && (
        <div className="opoker-panel-card p-3">
          <h3 className="opoker-panel-title">Seated</h3>
          <ul className="mt-1 space-y-1.5">
            {seatedPlayers.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex min-w-0 items-center gap-2">
                  <PlayerAvatar seed={p.name} name={p.name} image={p.avatar} size="sm" />
                  <span className="truncate text-zinc-400">{p.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-violet-300">
                  {formatTokens(p.stack)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="opoker-panel-card p-3">
        <h3 className="opoker-panel-title">Daily missions</h3>
        <ul className="mt-2 space-y-3">
          {MISSIONS.map((m) => (
            <li key={m.title}>
              <div className="mb-1 flex justify-between gap-2 text-[11px]">
                <span className="text-zinc-400">{m.title}</span>
                <span className="shrink-0 text-violet-400">+{m.reward} {TOKEN_SYMBOL}</span>
              </div>
              <div className="opoker-progress-track">
                <div
                  className="opoker-progress-fill"
                  style={{ width: `${(m.progress / m.total) * 100}%` }}
                />
              </div>
              <p className="mt-0.5 text-[9px] tabular-nums text-zinc-600">
                {m.progress}/{m.total}
              </p>
            </li>
          ))}
        </ul>
        <Link href="/#missions" className="mt-3 block text-[10px] font-semibold text-violet-400">
          View all missions →
        </Link>
      </div>
    </aside>
  );
}
