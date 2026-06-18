"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMinLoadingDuration } from "@/hooks/useMinLoadingDuration";
import DemoJoinScreen from "@/components/demo/DemoJoinScreen";
import DemoTableGameView from "@/components/demo/DemoTableGameView";
import LoadingLobby from "@/components/loading/LoadingLobby";
import { useDemoGame } from "@/hooks/useDemoGame";

export default function DemoPageClient() {
  const searchParams = useSearchParams();
  const game = useDemoGame();
  const {
    join,
    quickJoin,
    joinBots,
    joinError,
    sessionId,
    joining,
    connected,
    lobbyStats,
    tables,
    selectedRoomId,
    setSelectedRoomId,
    role,
  } = game;
  const [name, setName] = useState("");
  const minLoadingDone = useMinLoadingDuration(undefined, sessionId);
  const tourSpectateStarted = useRef(false);

  useEffect(() => {
    if (!sessionId) return;
    try {
      localStorage.setItem("solanawsop_demo_visited", "1");
    } catch {
      // ignore
    }
  }, [sessionId]);

  useEffect(() => {
    if (searchParams.get("tutorial") !== "spectate") return;
    if (sessionId || joining || !connected || tourSpectateStarted.current) return;
    tourSpectateStarted.current = true;
    const guest = `Guest${1000 + Math.floor(Math.random() * 9000)}`;
    setName(guest);
    void join(guest, false, selectedRoomId);
  }, [searchParams, sessionId, joining, connected, join, selectedRoomId]);

  if (!sessionId) {
    return (
      <DemoJoinScreen
        name={name}
        onNameChange={setName}
        connected={connected}
        joining={joining}
        error={joinError}
        tables={tables}
        selectedRoomId={selectedRoomId}
        onSelectRoom={setSelectedRoomId}
        lobbyStats={lobbyStats}
        onJoin={() => join(name, !lobbyStats.isFull, selectedRoomId)}
        onSpectate={() => join(name, false, selectedRoomId)}
        onQuickJoin={() => quickJoin(name)}
        onJoinBots={() => joinBots(name)}
      />
    );
  }

  const playersOnline = tables.reduce(
    (sum, t) => sum + t.playerCount + t.spectators,
    lobbyStats.playerCount + lobbyStats.spectators
  );

  if (!game.view || !minLoadingDone) {
    return (
      <LoadingLobby
        subtitle="Connecting to the demo table and syncing your seat…"
        playersOnline={playersOnline}
        tablesActive={tables.length || 1}
      />
    );
  }

  const fromTour = searchParams.get("tutorial") === "spectate";

  return (
    <div className="demo-table-page relative h-screen min-w-[1280px] overflow-hidden bg-[#050408]">
      {fromTour && role === "spectator" && (
        <div className="site-tour-demo-banner">
          Tour complete — you&apos;re spectating. Use <strong>Take a seat</strong> when you want to play.
        </div>
      )}
      <div className="demo-table-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 h-full">
        <DemoTableGameView game={game} />
      </div>
    </div>
  );
}
