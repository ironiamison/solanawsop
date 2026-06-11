"use client";

import { useEffect, useState } from "react";
import { useMinLoadingDuration } from "@/hooks/useMinLoadingDuration";
import DashboardShell from "@/components/layout/DashboardShell";
import DashboardFooter from "@/components/home/DashboardFooter";
import HomeHero from "@/components/home/HomeHero";
import DailyJackpotCard from "@/components/home/DailyJackpotCard";
import CashGameCard from "@/components/home/CashGameCard";
import TournamentsPanel from "@/components/home/TournamentsPanel";
import PlayerStatsCard from "@/components/home/PlayerStatsCard";
import HomeLeaderboard from "@/components/home/HomeLeaderboard";
import GettingStartedCard from "@/components/home/GettingStartedCard";
import SocialDiscoverCard from "@/components/home/SocialDiscoverCard";
import TestUsOutCard from "@/components/home/TestUsOutCard";
import LoadingLobby from "@/components/loading/LoadingLobby";
import { SectionTitle } from "@/components/home/lobby";
import { SHOW_DEV_CONTROLS, TOKEN_SYMBOL } from "@/lib/constants";
import { setupAllRooms } from "@/lib/program";
import { usePokerProgram } from "@/hooks/usePokerProgram";
import { useLobbyRooms } from "@/hooks/useLobbyRooms";

export default function Home() {
  const { program, publicKey, authenticated } = usePokerProgram();
  const { rooms, bestRoom, refresh: refreshRooms, loading: roomsLoading, onlinePlayers, activeTables } = useLobbyRooms();
  const tablesDeployed = rooms.some((r) => r.exists);
  const [status, setStatus] = useState<string | null>(null);
  const [totalHands, setTotalHands] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [showAllTables, setShowAllTables] = useState(false);
  const minLobbyDone = useMinLoadingDuration();

  const playHref = bestRoom
    ? `/table/${bestRoom.pubkey.toBase58()}`
    : "/#cash-games";

  useEffect(() => {
    fetch("/api/flywheel/stats")
      .then((r) => r.json())
      .then((d) => {
        if (d.handsPlayed) setTotalHands(d.handsPlayed);
        if (d.playersWithHands) setTotalPlayers(Math.max(d.playersWithHands, 1));
      })
      .catch(() => {});
  }, []);

  const handleSetup = async () => {
    if (!program || !publicKey) return;
    setStatus("Setting up tables…");
    try {
      const sig = await setupAllRooms(program, publicKey);
      await refreshRooms();
      setStatus(`Tables ready · ${sig.slice(0, 8)}…`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Setup failed";
      setStatus(
        msg.includes("globalConfig")
          ? "Program setup failed — refresh and try again (IDL was fixed)."
          : msg
      );
    }
  };

  const visibleRooms = showAllTables ? rooms : rooms.slice(0, 3);

  if (roomsLoading || !minLobbyDone) {
    return (
      <LoadingLobby playersOnline={onlinePlayers} tablesActive={activeTables} />
    );
  }

  return (
    <DashboardShell>
      {authenticated && program && publicKey && !tablesDeployed && (
        <div className="ui-alert ui-alert--amber mb-4">
          <p className="text-sm">
            On-chain {TOKEN_SYMBOL} tables are not initialized yet.
          </p>
          <p className="mt-1 text-xs opacity-80">
            After pump.fun launch, set NEXT_PUBLIC_SWSOP_MINT, connect wallet, and run one-time setup.
          </p>
          <button type="button" onClick={handleSetup} className="ui-btn ui-btn--primary ui-btn--sm mt-3">
            Initialize tables
          </button>
        </div>
      )}
      {SHOW_DEV_CONTROLS && authenticated && program && publicKey && tablesDeployed && (
        <button
          type="button"
          onClick={handleSetup}
          className="mb-2 text-[10px] text-zinc-700"
        >
          [dev] re-run room setup
        </button>
      )}
      {status && <p className="mb-2 text-xs text-zinc-600">{status}</p>}

      <GettingStartedCard />

      <div className="mb-5 grid gap-4 lg:grid-cols-[1fr_280px]">
        <HomeHero playTarget={bestRoom?.pubkey} />
        <DailyJackpotCard playHref={playHref} />
      </div>

      <div className="mb-5">
        <TestUsOutCard />
      </div>

      <div
        id="cash-games"
        className="mb-5 grid scroll-mt-20 gap-5 lg:grid-cols-[1fr_300px]"
      >
        <section>
          <SectionTitle
            action={
              <button
                type="button"
                onClick={() => setShowAllTables((v) => !v)}
                className="text-[11px] font-semibold text-violet-400 transition hover:text-violet-300"
              >
                {showAllTables ? "Show less" : "View all →"}
              </button>
            }
          >
            Cash games
          </SectionTitle>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleRooms.map((room) => (
              <CashGameCard
                key={room.tierIndex}
                tierIndex={room.tierIndex}
                label={room.label}
                pubkey={room.pubkey}
                playerCount={room.playerCount}
                phase={room.phase}
              />
            ))}
          </div>
        </section>
        <TournamentsPanel />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <PlayerStatsCard />
        <SocialDiscoverCard />
        <HomeLeaderboard />
      </div>

      <DashboardFooter totalHands={totalHands} totalPlayers={totalPlayers} />
    </DashboardShell>
  );
}
