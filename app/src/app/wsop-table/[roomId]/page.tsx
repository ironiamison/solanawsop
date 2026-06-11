"use client";

import { use, useEffect, useState } from "react";
import { usePokerProgram } from "@/hooks/usePokerProgram";
import { useMinLoadingDuration } from "@/hooks/useMinLoadingDuration";
import { useChipRoomGame } from "@/hooks/useChipRoomGame";
import DemoJoinScreen from "@/components/demo/DemoJoinScreen";
import DemoTableGameView from "@/components/demo/DemoTableGameView";
import LoadingLobby from "@/components/loading/LoadingLobby";
import { BRAND_NAME, TOKEN_SYMBOL, formatTokens } from "@/lib/constants";

export default function WsopTablePage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const { publicKey } = usePokerProgram();
  const [name, setName] = useState("");
  const [tableMeta, setTableMeta] = useState<{
    name: string | null;
    tierLabel: string;
    buyInRaw: string;
  } | null>(null);

  const game = useChipRoomGame({
    apiBase: `/api/wsop-table/${roomId}`,
    storageKey: `solanawsop_wsop_${roomId}`,
    extra: { wallet: publicKey?.toBase58() ?? null },
    pollMs: 1000,
  });

  const minLoadingDone = useMinLoadingDuration(undefined, game.sessionId);

  useEffect(() => {
    fetch(`/api/wsop-table?roomId=${encodeURIComponent(roomId)}`)
      .then((r) => r.json())
      .then((d) => setTableMeta(d.table ?? null))
      .catch(() => setTableMeta(null));
  }, [roomId]);

  if (!game.sessionId) {
    return (
      <DemoJoinScreen
        name={name}
        onNameChange={setName}
        connected={game.connected}
        joining={game.joining}
        error={game.joinError}
        tables={[]}
        selectedRoomId={roomId}
        onSelectRoom={() => {}}
        lobbyStats={game.lobbyStats}
        onJoin={() =>
          game.join(name, true, { wallet: publicKey?.toBase58() })
        }
        onSpectate={() =>
          game.join(name, false, { wallet: publicKey?.toBase58() })
        }
        onQuickJoin={() =>
          game.join(name, true, { wallet: publicKey?.toBase58() })
        }
      />
    );
  }

  if (!game.view || !minLoadingDone) {
    return (
      <LoadingLobby
        subtitle={`Joining ${tableMeta?.name ?? "private table"}…`}
        tablesActive={1}
      />
    );
  }

  const buyIn = game.view.buyIn;

  return (
    <div className="demo-table-page relative h-screen min-w-[1280px] overflow-hidden bg-[#050408]">
      <div className="demo-table-bg pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative z-10 h-full">
        <DemoTableGameView
          game={game}
          tableTitle={`${tableMeta?.name ?? "Private"} · ${TOKEN_SYMBOL}`}
          buyInLabel={`${formatTokens(buyIn)} ${TOKEN_SYMBOL}`}
          blindsLabel={`${formatTokens(buyIn / 4000)} / ${formatTokens(buyIn / 2000)}`}
          roomId={roomId}
          hideChat
        />
      </div>
    </div>
  );
}
