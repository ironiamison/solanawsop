"use client";

import { useEffect, useState } from "react";
import { useMinLoadingDuration } from "@/hooks/useMinLoadingDuration";
import DemoJoinScreen from "@/components/demo/DemoJoinScreen";
import DemoTableGameView from "@/components/demo/DemoTableGameView";
import LoadingLobby from "@/components/loading/LoadingLobby";
import { useDemoGame } from "@/hooks/useDemoGame";

export default function DemoPage() {
  const game = useDemoGame();
  const {
    join,
    quickJoin,
    joinError,
    sessionId,
    joining,
    connected,
    lobbyStats,
    tables,
    selectedRoomId,
    setSelectedRoomId,
  } = game;
  const [name, setName] = useState("");
  const minLoadingDone = useMinLoadingDuration(undefined, sessionId);

  useEffect(() => {
    if (!sessionId) return;
    try {
      localStorage.setItem("solanawsop_demo_visited", "1");
    } catch {
      // ignore
    }
  }, [sessionId]);

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

  return (
    <div className="demo-table-page relative h-screen min-w-[1280px] overflow-hidden bg-[#050408]">
      <div className="demo-table-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 h-full">
        <DemoTableGameView game={game} />
      </div>
    </div>
  );
}
