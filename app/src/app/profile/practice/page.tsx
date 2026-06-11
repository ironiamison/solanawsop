"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import DashboardShell from "@/components/layout/DashboardShell";
import { GuestGatedContent } from "@/components/profile/GuestGatedPage";
import DemoTableGameView from "@/components/demo/DemoTableGameView";
import LoadingLobby from "@/components/loading/LoadingLobby";
import { useChipRoomGame } from "@/hooks/useChipRoomGame";
import { useMinLoadingDuration } from "@/hooks/useMinLoadingDuration";
import { usePrivyProfile } from "@/hooks/usePrivyProfile";
import { usePokerProgram } from "@/hooks/usePokerProgram";
import { BRAND_NAME, TOKEN_SYMBOL, formatTokens } from "@/lib/constants";
import { DEMO_BIG_BLIND, DEMO_SMALL_BLIND } from "@/lib/demo/constants";

export default function PracticePage() {
  const { authenticated, ready } = usePrivy();
  const profile = usePrivyProfile();
  const { publicKey } = usePokerProgram();

  const userKey = useMemo(
    () => publicKey?.toBase58() ?? profile.walletAddress ?? null,
    [publicKey, profile.walletAddress]
  );

  const game = useChipRoomGame({
    apiBase: "/api/practice",
    storageKey: userKey ? `solanawsop_practice_${userKey}` : "practice",
    extra: { userKey },
    pollMs: 900,
  });

  const minLoadingDone = useMinLoadingDuration(undefined, game.sessionId);
  const displayName =
    profile.twitterHandle ?? profile.displayName ?? "Player";

  const autoJoined = useRef(false);
  useEffect(() => {
    if (!userKey || game.sessionId || autoJoined.current) return;
    autoJoined.current = true;
    void game.join(displayName, true);
  }, [userKey, game.sessionId, displayName, game.join]);

  if (!ready) {
    return (
      <DashboardShell>
        <div className="profile-loading">Loading…</div>
      </DashboardShell>
    );
  }

  return (
    <GuestGatedContent tab="tables">
      <div className="mb-3 px-2">
        <Link href="/profile?tab=tables" className="text-xs text-violet-400 hover:text-violet-300">
          ← Back to private tables
        </Link>
      </div>
      {!authenticated || !userKey ? (
        <p className="profile-loading">Sign in to practice vs bots.</p>
      ) : !game.view || !minLoadingDone ? (
        <LoadingLobby
          subtitle="Seating you vs bots…"
          tablesActive={1}
        />
      ) : (
        <div className="demo-table-page relative h-[calc(100vh-4rem)] min-w-[1280px] overflow-hidden rounded-xl border border-white/5 bg-[#050408]">
          <div className="demo-table-bg pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative z-10 h-full">
            <DemoTableGameView
              game={game}
              tableTitle={`${BRAND_NAME} · Test your strategy`}
              buyInLabel={`100K play ${TOKEN_SYMBOL}`}
              blindsLabel={`${formatTokens(DEMO_SMALL_BLIND)} / ${formatTokens(DEMO_BIG_BLIND)}`}
              hideChat
            />
          </div>
        </div>
      )}
    </GuestGatedContent>
  );
}
