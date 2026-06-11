"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import PokerTable from "./PokerTable";
import GameplayLayout from "./game/GameplayLayout";
import TableRightPanel from "./game/TableRightPanel";
import TableChatDock from "./game/TableChatDock";
import ActionPanel from "./game/ActionPanel";
import TableControls, { TableControlBtn } from "./game/TableControls";
import LoadingLobby from "@/components/loading/LoadingLobby";
import TableNotFoundView from "@/components/table/TableNotFoundView";
import PrivateTableJoinBanner, {
  isWalletInvited,
} from "@/components/table/PrivateTableJoinBanner";
import { BRAND_NAME, BUY_IN_TIERS, formatSolCompact, formatTokens, TOKEN_SYMBOL } from "@/lib/constants";
import LoginButton from "@/components/LoginButton";
import {
  joinRoomByPubkey,
  leaveRoomByPubkey,
  playerActionByRoom,
  startHandByRoom,
} from "@/lib/program";
import {
  getMyPlayer,
  getPlayerPubkeys,
  useRoomByPubkey,
} from "@/hooks/useRoom";
import { useSocket } from "@/hooks/useSocket";
import { usePokerProgram } from "@/hooks/usePokerProgram";
import { useMinLoadingDuration } from "@/hooks/useMinLoadingDuration";
import { usePrivyProfile } from "@/hooks/usePrivyProfile";
import { useTurnTimer } from "@/hooks/useTurnTimer";
import { useHandRewards } from "@/hooks/useHandRewards";

interface Props {
  roomPubkey: string;
}

function formatBlinds(buyIn: number, sol = false): string {
  const bb = buyIn;
  const sb = Math.floor(bb / 2);
  if (sol) return `${formatSolCompact(sb)} / ${formatSolCompact(bb)}`;
  const fmt = (n: number) => {
    if (n >= 1_000_000) return `${n / 1_000_000}M`;
    if (n >= 1_000) return `${n / 1_000}K`;
    return String(n);
  };
  return `${fmt(sb)} / ${fmt(bb)}`;
}

export default function TableGameView({ roomPubkey }: Props) {
  const { program, connection, publicKey, authenticated } = usePokerProgram();
  const profile = usePrivyProfile();
  const { room, players, loading, initialLoadDone, error, refresh } =
    useRoomByPubkey(connection, roomPubkey);
  const { connected, messages, sendMessage, socket } = useSocket(roomPubkey);
  const minLoadingDone = useMinLoadingDuration(undefined, roomPubkey);

  const [betAmount, setBetAmount] = useState(0);
  const [txPending, setTxPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [lastTxSig, setLastTxSig] = useState<string | null>(null);
  const [privateTableName, setPrivateTableName] = useState<string | null>(null);
  const [localTurnStartedAt, setLocalTurnStartedAt] = useState<number | undefined>();
  const prevTurnKey = useRef("");
  const autoFoldSent = useRef(false);

  const myPlayer = getMyPlayer(players, publicKey ?? undefined);

  useHandRewards({
    source: "onchain",
    isSeated: !!myPlayer,
    phase: room?.phase,
  });

  const isMyTurn =
    myPlayer &&
    room &&
    room.currentTurnSeat === myPlayer.seat &&
    room.phase !== "waiting";

  const callAmount =
    myPlayer && room ? Math.max(0, room.currentBet - myPlayer.roundBet) : 0;

  useEffect(() => {
    if (!room?.isPrivate) {
      setPrivateTableName(null);
      return;
    }
    fetch(`/api/tables/private?room=${encodeURIComponent(roomPubkey)}`)
      .then((r) => r.json())
      .then((d) => {
        setPrivateTableName(d.table?.name ?? null);
      })
      .catch(() => setPrivateTableName(null));
  }, [room?.isPrivate, roomPubkey]);

  const isCreator =
    !!room && !!publicKey && room.creator.equals(publicKey);
  const invited = room ? isWalletInvited(room.invited, publicKey) : false;
  const canJoinPrivate = !room?.isPrivate || isCreator || invited;

  const isPrivateTable = !!room?.isPrivate;
  const formatAmount = isPrivateTable
    ? (n: number) => formatSolCompact(n)
    : (n: number) => formatTokens(n);

  const tierLabel = room?.isPrivate
    ? privateTableName ?? "Private table"
    : room
      ? BUY_IN_TIERS[room.tierIndex]?.label ?? `${TOKEN_SYMBOL} table`
      : TOKEN_SYMBOL;

  useEffect(() => {
    if (!myPlayer || !room) return;
    const minRaise = room.minRaise || room.buyIn / 100;
    const defaultBet = Math.max(room.currentBet + minRaise, callAmount + minRaise);
    setBetAmount(Math.min(defaultBet, myPlayer.stack));
  }, [myPlayer, room, callAmount, isMyTurn]);

  useEffect(() => {
    if (!room || room.phase === "waiting" || room.phase === "showdown") {
      setLocalTurnStartedAt(undefined);
      prevTurnKey.current = "";
      return;
    }
    const key = `${room.phase}-${room.currentTurnSeat}`;
    if (key !== prevTurnKey.current) {
      prevTurnKey.current = key;
      setLocalTurnStartedAt(Date.now());
    }
  }, [room?.phase, room?.currentTurnSeat]);

  const roomWithTimer = useMemo(
    () =>
      room
        ? { ...room, turnStartedAt: localTurnStartedAt ?? room.turnStartedAt }
        : null,
    [room, localTurnStartedAt]
  );

  const turnTimerActive = !!(isMyTurn && myPlayer && localTurnStartedAt);
  const { secondsLeft, progress, expired, urgent } = useTurnTimer(
    turnTimerActive,
    localTurnStartedAt
  );

  useEffect(() => {
    autoFoldSent.current = false;
  }, [localTurnStartedAt, room?.currentTurnSeat, room?.phase]);

  const runTx = useCallback(
    async (label: string, fn: () => Promise<string>) => {
      if (!program) return;
      setTxPending(true);
      setStatus(`${label}…`);
      try {
        const sig = await fn();
        setLastTxSig(sig);
        setStatus(null);
        await refresh();
      } catch (e) {
        setStatus(e instanceof Error ? e.message : `${label} failed`);
      } finally {
        setTxPending(false);
      }
    },
    [program, refresh]
  );

  const roomPk = new PublicKey(roomPubkey);

  const handleJoin = () =>
    runTx("Join", () => joinRoomByPubkey(program!, publicKey!, roomPk));

  const handleLeave = () =>
    runTx("Leave", () => leaveRoomByPubkey(program!, publicKey!, roomPk));

  const handleStartHand = () =>
    runTx("Deal", () =>
      startHandByRoom(program!, publicKey!, roomPk, getPlayerPubkeys(players))
    );

  const handleAction = (action: Parameters<typeof playerActionByRoom>[3]) =>
    runTx("Action", () =>
      playerActionByRoom(
        program!,
        publicKey!,
        roomPk,
        action,
        getPlayerPubkeys(players)
      )
    );

  const handleRaise = () => {
    if (!room) return;
    const raiseIncrement = betAmount - room.currentBet;
    if (raiseIncrement < room.minRaise) return;
    handleAction({ raise: { amount: new BN(raiseIncrement) } });
  };

  useEffect(() => {
    if (
      !expired ||
      !isMyTurn ||
      !myPlayer ||
      txPending ||
      autoFoldSent.current ||
      !program ||
      !publicKey
    ) {
      return;
    }
    autoFoldSent.current = true;
    runTx("Action", () =>
      playerActionByRoom(
        program,
        publicKey,
        roomPk,
        { fold: {} },
        getPlayerPubkeys(players)
      )
    );
  }, [expired, isMyTurn, myPlayer, txPending, program, publicKey, runTx, players, roomPk]);

  if (!initialLoadDone || loading) {
    return (
      <LoadingLobby subtitle="Loading table state from Solana…" tablesActive={1} />
    );
  }

  if (!room) {
    return <TableNotFoundView roomPubkey={roomPubkey} />;
  }

  if (!minLoadingDone) {
    return (
      <LoadingLobby subtitle="Loading table state from Solana…" tablesActive={1} />
    );
  }

  return (
    <GameplayLayout
      tableTitle={`${BRAND_NAME} · ${tierLabel}`}
      blindsLabel={formatBlinds(room.buyIn, isPrivateTable)}
      buyInLabel={isPrivateTable ? formatSolCompact(room.buyIn) : `${tierLabel} ${TOKEN_SYMBOL}`}
      playerCount={room.playerCount}
      userLabel={
        profile.twitterHandle
          ? `@${profile.twitterHandle}`
          : publicKey
            ? `${publicKey.toBase58().slice(0, 4)}…${publicKey.toBase58().slice(-4)}`
            : "Guest"
      }
      userAvatar={profile.avatar}
      stack={myPlayer?.stack ?? 0}
      topBanner={
        <>
          {error && (
            <div className="mx-4 mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
          {!authenticated && (
            <div className="mx-4 mt-2 flex items-center justify-between gap-3 rounded-lg border border-violet-500/25 bg-violet-500/10 px-4 py-3">
              <p className="text-xs text-violet-100">Connect your wallet to take a seat at {BRAND_NAME}</p>
              <LoginButton />
            </div>
          )}
          {status && (
            <div className="mx-4 mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200">
              {status}
            </div>
          )}
          {room.isPrivate && (
            <div className="mx-4 mt-2">
              <PrivateTableJoinBanner
                roomPubkey={roomPubkey}
                buyIn={room.buyIn}
                tableName={privateTableName}
                isCreator={isCreator}
                isInvited={invited}
                walletAddress={publicKey?.toBase58()}
              />
            </div>
          )}
          <TableControls>
            {!myPlayer && publicKey && program && canJoinPrivate && (
              <TableControlBtn
                onClick={handleJoin}
                disabled={txPending || room.phase !== "waiting"}
              >
                Take a seat
              </TableControlBtn>
            )}
            {myPlayer && room.phase === "waiting" && (
              <>
                <TableControlBtn variant="danger" onClick={handleLeave} disabled={txPending}>
                  Leave
                </TableControlBtn>
                {room.playerCount >= 2 && (
                  <TableControlBtn onClick={handleStartHand} disabled={txPending}>
                    Shuffle & deal
                  </TableControlBtn>
                )}
              </>
            )}
          </TableControls>
        </>
      }
      tableArea={
        <PokerTable
          room={roomWithTimer ?? room}
          players={players}
          myWallet={publicKey ?? undefined}
          formatAmount={formatAmount}
        />
      }
      actionBar={
        <ActionPanel
          visible={!!(isMyTurn && myPlayer)}
          showShell={!!(myPlayer && room.phase !== "waiting")}
          timerSecondsLeft={turnTimerActive ? secondsLeft : undefined}
          timerProgress={turnTimerActive ? progress : undefined}
          timerUrgent={urgent}
          canCheck={myPlayer ? myPlayer.roundBet >= room.currentBet : false}
          callAmount={callAmount}
          pot={room.pot}
          stack={myPlayer?.stack ?? 0}
          minRaise={room.minRaise || 1000}
          currentBet={room.currentBet}
          betAmount={betAmount}
          onBetAmountChange={setBetAmount}
          formatAmount={formatAmount}
          onFold={() => handleAction({ fold: {} })}
          onCheck={() => handleAction({ check: {} })}
          onCall={() => handleAction({ call: {} })}
          onRaise={handleRaise}
          pending={txPending}
        />
      }
      chatDock={
        publicKey ? (
          <TableChatDock
            connected={connected}
            messages={messages}
            wallet={publicKey.toBase58()}
            roomId={roomPubkey}
            socket={socket}
            onSend={(text) =>
              sendMessage({
                roomId: roomPubkey,
                wallet: publicKey.toBase58(),
                displayName: profile.displayName,
                avatar: profile.avatar,
                text,
              })
            }
          />
        ) : undefined
      }
      rightPanel={
        <TableRightPanel
          phase={room.phase}
          roomPubkey={roomPubkey}
          lastTxSig={lastTxSig}
          playerCount={room.playerCount}
        />
      }
    />
  );
}
