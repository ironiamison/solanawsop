"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import BrandWordLockup from "@/components/brand/BrandWordLockup";
import LobbyAssetImage from "@/components/home/LobbyAssetImage";
import { validateUsername, normalizeUsername } from "@/lib/demo/ids";
import { DEMO_MAX_PLAYERS } from "@/lib/demo/constants";
import type { DemoTableInfo } from "@/lib/demo/types";

export type DemoLobbyStats = {
  playerCount: number;
  spectators: number;
  isFull: boolean;
  maxPlayers: number;
};

function phaseLabel(phase: DemoTableInfo["phase"]): string {
  if (phase === "waiting") return "Waiting";
  if (phase === "showdown") return "Showdown";
  return phase.replace(/-/g, " ");
}

export default function DemoJoinScreen({
  name,
  onNameChange,
  connected,
  joining,
  error,
  tables,
  selectedRoomId,
  onSelectRoom,
  lobbyStats,
  onJoin,
  onSpectate,
  onQuickJoin,
  onJoinBots,
}: {
  name: string;
  onNameChange: (v: string) => void;
  connected: boolean;
  joining: boolean;
  error: string | null;
  tables: DemoTableInfo[];
  selectedRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  lobbyStats: DemoLobbyStats;
  onJoin: () => void;
  onSpectate: () => void;
  onQuickJoin: () => void;
  onJoinBots?: () => void;
}) {
  const normalized = normalizeUsername(name);
  const isValid = validateUsername(name) !== null;

  const selectedTable =
    tables.find((t) => t.roomId === selectedRoomId) ?? tables[0] ?? null;
  const openTables = tables.filter((t) => !t.isFull);
  const allFull = tables.length > 0 && openTables.length === 0;

  const statusText = useMemo(() => {
    if (joining) return "Joining table";
    if (!connected) return "Connecting to server";
    if (selectedTable?.isFull) return "Table full — spectate or pick another";
    if (allFull) return "All tables full — quick join opens a new table";
    return "Ready to join";
  }, [joining, connected, selectedTable?.isFull, allFull]);

  return (
    <div className="demo-join-page relative min-h-screen overflow-hidden">
      <Image
        src="/assets/lobby/demo-join-bg.png"
        alt=""
        fill
        priority
        unoptimized
        className="object-cover object-center scale-105"
        sizes="100vw"
      />
      <div className="demo-join-vignette absolute inset-0" aria-hidden />
      <div className="demo-join-glow absolute inset-0" aria-hidden />

      <Link
        href="/"
        className="demo-join-close absolute right-5 top-5 z-20"
        aria-label="Close"
      >
        ✕
      </Link>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 sm:p-8">
        <div className="demo-join-shell w-full max-w-[480px]">
          <header className="demo-join-brand">
            <BrandWordLockup size="lg" priority showTagline />
          </header>

          <article className="demo-join-card">
            <div className="demo-join-card-shine" aria-hidden />

            <div className="demo-join-card-head">
              <div className="demo-join-head-row">
                <span className="demo-join-pill">Free · No wallet</span>
                <span
                  className={`demo-join-live ${connected ? "demo-join-live-on" : ""}`}
                >
                  <span className="demo-join-live-dot" />
                  {connected ? "Live" : "Connecting"}
                </span>
              </div>
              <h1 className="demo-join-title">Free play lobby</h1>
              <p className="demo-join-sub">
                Pick a table or quick join the first open seat. New tables only
                open when every table is full.
              </p>
            </div>

            {tables.length > 0 && (
              <div className="mb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="demo-join-label mb-0">Tables</p>
                  <button
                    type="button"
                    onClick={onQuickJoin}
                    disabled={!isValid || joining || !connected}
                    className="text-[11px] font-medium text-violet-400 hover:text-violet-300 disabled:opacity-40"
                  >
                    Quick join →
                  </button>
                </div>
                <ul className="max-h-44 space-y-1.5 overflow-y-auto pr-0.5">
                  {tables.map((table) => {
                    const selected = table.roomId === selectedTable?.roomId;
                    return (
                      <li key={table.roomId}>
                        <button
                          type="button"
                          onClick={() => onSelectRoom(table.roomId)}
                          className={`demo-join-input ui-surface-inset flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition ${
                            selected
                              ? "ring-1 ring-violet-500/50 bg-violet-500/5"
                              : "hover:bg-white/[0.03]"
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-white">
                              {table.label}
                              {table.botsOnly ? (
                                <span className="ml-1.5 text-[10px] font-semibold text-violet-400">
                                  · vs bots
                                </span>
                              ) : null}
                            </span>
                            <span className="block text-[10px] capitalize text-zinc-500">
                              {phaseLabel(table.phase)}
                              {table.spectators > 0
                                ? ` · ${table.spectators} watching`
                                : ""}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              table.isFull
                                ? "bg-zinc-700/60 text-zinc-400"
                                : "bg-emerald-500/15 text-emerald-400"
                            }`}
                          >
                            {table.playerCount}/{table.maxPlayers}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <div className="demo-join-form space-y-3">
              <div>
                <label className="demo-join-label" htmlFor="demo-username">
                  Username
                </label>
                <div
                  className={`demo-join-input ui-surface-inset mt-1.5 flex items-center gap-2.5 px-3.5 py-3 ${
                    isValid ? "ring-1 ring-violet-500/40" : ""
                  }`}
                >
                  <UserIcon className="h-4 w-4 shrink-0 text-emerald-400/90" />
                  <input
                    id="demo-username"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    placeholder="e.g. demon_main"
                    maxLength={20}
                    autoComplete="off"
                    className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
                    onKeyDown={(e) =>
                      e.key === "Enter" && isValid && !joining && connected && onJoin()
                    }
                  />
                  {isValid && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400">
                      ✓
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[10px] text-zinc-600">
                  2–16 characters · letters, numbers, _
                  {normalized !== name.trim() && normalized.length >= 2 && (
                    <span className="text-emerald-500/80"> → {normalized}</span>
                  )}
                </p>
              </div>

              <div className="demo-join-status ui-surface-inset flex items-center gap-2.5 px-3.5 py-2.5">
                <UsersIcon
                  className={`h-4 w-4 shrink-0 ${joining || !connected ? "animate-pulse text-emerald-400" : "text-zinc-500"}`}
                />
                <span className="text-[12px] text-zinc-400">
                  {statusText}
                  {(joining || !connected) && (
                    <span className="demo-join-dots ml-0.5 inline-flex" aria-hidden>
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </span>
                  )}
                </span>
              </div>

              {error && (
                <p className="ui-alert ui-alert--error">
                  {error}
                </p>
              )}

              <div className="flex gap-2.5 pt-0.5">
                <button
                  type="button"
                  onClick={onJoin}
                  disabled={!isValid || joining || !connected}
                  className="demo-join-btn-primary flex flex-1 items-center justify-center gap-2"
                >
                  <SpadeIcon className="h-3.5 w-3.5" />
                  {selectedTable?.isFull ? "Join (spectate)" : "Join table"}
                </button>
                <button
                  type="button"
                  onClick={onSpectate}
                  disabled={!isValid || joining || !connected || !selectedTable}
                  className="demo-join-btn-ghost flex items-center justify-center gap-1.5 px-5"
                >
                  <EyeIcon className="h-3.5 w-3.5" />
                  Spectate
                </button>
              </div>
              {onJoinBots ? (
                <button
                  type="button"
                  onClick={onJoinBots}
                  disabled={!isValid || joining || !connected}
                  className="demo-join-btn-bots mt-2 w-full"
                >
                  Practice vs bots — solo table, adjustable difficulty
                </button>
              ) : null}
            </div>

            <div className="demo-join-stats">
              <StatCell
                icon={<ChipIcon />}
                label="Start stack"
                value="100,000"
                sub="Fake chips"
              />
              <StatCell
                icon={<UsersIcon className="h-4 w-4" />}
                label={selectedTable ? selectedTable.label : "Players"}
                value={`${lobbyStats.playerCount}/${DEMO_MAX_PLAYERS}`}
                sub={lobbyStats.isFull ? "Table full" : "Seats open"}
                highlight={!lobbyStats.isFull && lobbyStats.playerCount > 0}
              />
              <StatCell
                icon={<ChatIcon />}
                label="Tables"
                value={String(tables.length || 1)}
                sub={allFull ? "All full" : `${openTables.length} open`}
              />
            </div>
          </article>

          <div className="demo-join-chip-deco pointer-events-none" aria-hidden>
            <LobbyAssetImage
              src="/assets/lobby/chip-stack-3d.png"
              alt=""
              width={120}
              height={80}
              className="h-20 w-auto opacity-35"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
  sub,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className={`demo-join-stat${highlight ? " demo-join-stat-live" : ""}`}>
      <div className="demo-join-stat-icon">{icon}</div>
      <p className="demo-join-stat-label">{label}</p>
      <p className="demo-join-stat-value">{value}</p>
      <p className="demo-join-stat-sub">{sub}</p>
    </div>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function SpadeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2c-2.5 3.5-6 5.5-6 9a4 4 0 007.2 2.4C11.5 15.8 10.8 17 10 18h4c-.8-1-1.5-2.2-1.2-3.6A4 4 0 0018 11c0-3.5-3.5-5.5-6-9z" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function ChipIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="8.5" strokeWidth={1.75} />
      <circle cx="12" cy="12" r="4" strokeWidth={1.75} />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.75}
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}
