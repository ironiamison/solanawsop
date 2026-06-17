"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import PokerTable from "./PokerTable";
import GameplayLayout from "./game/GameplayLayout";
import TableRightPanel from "./game/TableRightPanel";
import TableVerificationCard from "./game/TableVerificationCard";
import TableChatDock from "./game/TableChatDock";
import ActionPanel from "./game/ActionPanel";
import TableControls, { TableControlBtn } from "./game/TableControls";
import LoadingLobby from "@/components/loading/LoadingLobby";
import TableNotFoundView from "@/components/table/TableNotFoundView";
import PrivateTableJoinBanner, {
  isWalletInvited,
} from "@/components/table/PrivateTableJoinBanner";
import { BRAND_NAME, BUY_IN_TIERS, formatTokens, TOKEN_SYMBOL } from "@/lib/constants";
import { fetchTokenBalance, getSwspMint } from "@/lib/swsop-token";
import LoginButton from "@/components/LoginButton";
import {
  cacheHoleCards,
  parseHoleCardsDealt,
} from "@/lib/fairness/events";
import {
  joinRoomByPubkey,
  leaveRoomByPubkey,
  playerActionByRoom,
  revealHoleCardsByRoom,
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

function formatBlinds(buyIn: number): string {
  const bb = buyIn;
  const sb = Math.floor(bb / 2);
  return `${formatTokens(sb)} / ${formatTokens(bb)}`;
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
  const [walletTokenBalance, setWalletTokenBalance] = useState<bigint | null>(null);
  const [localTurnStartedAt, setLocalTurnStartedAt] = useState<number | undefined>();
  const prevTurnKey = useRef("");
  const autoFoldSent = useRef(false);
  const autoDealSent = useRef(false);
  const dealHandRef = useRef<() => void>(() => {});

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

  const formatAmount = (n: number) => formatTokens(n);

  useEffect(() => {
    if (!connection || !publicKey || !getSwspMint()) {
      setWalletTokenBalance(null);
      return;
    }
    fetchTokenBalance(connection, publicKey)
      .then(setWalletTokenBalance)
      .catch(() => setWalletTokenBalance(null));
  }, [connection, publicKey, myPlayer?.stack, room?.phase]);

  const tierLabel = room?.isPrivate
    ? privateTableName ?? "Private table"
    : room
      ? BUY_IN_TIERS[room.tierIndex]?.label ?? `${TOKEN_SYMBOL} table`
      : TOKEN_SYMBOL;

  const lastBetTurnKey = useRef("");

  useEffect(() => {
    if (!myPlayer || !room || !isMyTurn) return;
    const turnKey = `${room.phase}-${room.currentTurnSeat}-${localTurnStartedAt ?? room.turnStartedAt}`;
    if (turnKey === lastBetTurnKey.current) return;
    lastBetTurnKey.current = turnKey;

    const minRaise = room.minRaise || room.buyIn / 100;
    const maxRaiseTo = myPlayer.roundBet + myPlayer.stack;
    const minRaiseTo =
      room.currentBet === 0
        ? Math.min(maxRaiseTo, minRaise)
        : Math.min(maxRaiseTo, room.currentBet + minRaise);
    setBetAmount(minRaiseTo);
  }, [myPlayer, room, isMyTurn, localTurnStartedAt]);

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
      setStatus(`Confirm ${label.toLowerCase()} in your wallet…`);
      try {
        const sig = await fn();
        setLastTxSig(sig);
        setStatus(`${label} confirmed · ${sig.slice(0, 8)}…`);
        window.setTimeout(() => setStatus(null), 4500);
        await refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : `${label} failed`;
        setStatus(msg.includes("User rejected") ? "Transaction cancelled" : msg);
      } finally {
        setTxPending(false);
      }
    },
    [program, refresh]
  );

  const roomPk = new PublicKey(roomPubkey);
  const activeHand = room?.handNumber ?? 1;

  const handleJoin = () => {
    if (!room) return;
    const buyIn = BigInt(room.buyIn);
    if (walletTokenBalance !== null && walletTokenBalance < buyIn) {
      setStatus(
        `Need ${formatTokens(buyIn)} ${TOKEN_SYMBOL} in wallet — you have ${formatTokens(walletTokenBalance)}`
      );
      return;
    }
    runTx("Join", () => joinRoomByPubkey(program!, publicKey!, roomPk));
  };

  const handleLeave = () =>
    runTx("Leave", () => leaveRoomByPubkey(program!, publicKey!, roomPk));

  const handleStartHand = () => {
    if (!room || !connection) return;
    const nextHand = (room.handNumber ?? 0) + 1;
    runTx("Deal", async () => {
      const sig = await startHandByRoom(
        program!,
        publicKey!,
        roomPk,
        getPlayerPubkeys(players),
        nextHand
      );
      const dealt = await parseHoleCardsDealt(connection, sig);
      for (const ev of dealt) {
        cacheHoleCards(roomPubkey, nextHand, ev.wallet.toBase58(), [
          ev.card0,
          ev.card1,
        ]);
      }
      if (publicKey && dealt.some((e) => e.wallet.equals(publicKey))) {
        try {
          await revealHoleCardsByRoom(program!, publicKey, roomPk, nextHand);
        } catch {
          // event cache still shows hero cards locally
        }
      }
      return sig;
    });
  };

  dealHandRef.current = handleStartHand;

  useEffect(() => {
    if (room?.phase !== "waiting") {
      autoDealSent.current = false;
    }
  }, [room?.phase, room?.playerCount]);

  useEffect(() => {
    if (
      !room ||
      !myPlayer ||
      !program ||
      !publicKey ||
      !connection ||
      txPending ||
      autoDealSent.current
    ) {
      return;
    }
    if (room.phase !== "waiting" || room.playerCount < 2) return;

    const lowestSeat = Math.min(...players.map((p) => p.seat));
    if (myPlayer.seat !== lowestSeat) return;

    const delayMs = (room.handNumber ?? 0) === 0 ? 0 : 3000;
    const timer = window.setTimeout(() => {
      if (autoDealSent.current) return;
      autoDealSent.current = true;
      dealHandRef.current();
    }, delayMs);
    return () => window.clearTimeout(timer);
  }, [
    room?.phase,
    room?.playerCount,
    room?.handNumber,
    myPlayer,
    players,
    program,
    publicKey,
    connection,
    txPending,
  ]);

  const handleAction = (action: Parameters<typeof playerActionByRoom>[3]) =>
    runTx("Action", () =>
      playerActionByRoom(
        program!,
        publicKey!,
        roomPk,
        action,
        getPlayerPubkeys(players),
        activeHand
      )
    );

  const maxRaiseTo = (myPlayer?.roundBet ?? 0) + (myPlayer?.stack ?? 0);
  const minRaiseTo = room
    ? room.currentBet === 0
      ? Math.min(maxRaiseTo, room.minRaise || 1000)
      : Math.min(maxRaiseTo, room.currentBet + (room.minRaise || 1000))
    : 0;
  const clampedBet = Math.min(maxRaiseTo, Math.max(minRaiseTo, betAmount));

  const handleRaise = () => {
    if (!room) return;
    const raiseIncrement = clampedBet - room.currentBet;
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
        getPlayerPubkeys(players),
        activeHand
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
      blindsLabel={`${formatBlinds(room.buyIn)} ${TOKEN_SYMBOL}`}
      buyInLabel={`${formatTokens(room.buyIn)} ${TOKEN_SYMBOL}`}
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
          {authenticated && !getSwspMint() && (
            <div className="mx-4 mt-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs text-amber-100">
              Set <code className="text-amber-50">NEXT_PUBLIC_SWSOP_MINT</code> to your pump.fun token mint to enable real {TOKEN_SYMBOL} escrow.
            </div>
          )}
          {authenticated && walletTokenBalance !== null && !myPlayer && (
            <div className="mx-4 mt-2 text-center text-[11px] text-zinc-500">
              Wallet: {formatTokens(walletTokenBalance)} {TOKEN_SYMBOL}
              {room && (
                <span className="text-zinc-600">
                  {" "}
                  · buy-in {formatTokens(room.buyIn)} {TOKEN_SYMBOL}
                </span>
              )}
            </div>
          )}
          {status && (
            <div
              className={`mx-4 mt-2 rounded-lg border px-3 py-2 text-center text-xs ${
                txPending
                  ? "border-cyan-500/25 bg-cyan-500/10 text-cyan-100"
                  : status.includes("confirmed")
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                    : "border-amber-500/20 bg-amber-500/10 text-amber-200"
              }`}
            >
              {status}
              {lastTxSig && status.includes("confirmed") && (
                <>
                  {" "}
                  <a
                    href={`https://solscan.io/tx/${lastTxSig}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-white"
                  >
                    Solscan
                  </a>
                </>
              )}
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
          fairnessMode="onchain-cash"
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
          roundBet={myPlayer?.roundBet ?? 0}
          minRaise={room.minRaise || 1000}
          currentBet={room.currentBet}
          betAmount={clampedBet}
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
        <>
          <TableVerificationCard
            room={room}
            roomPubkey={roomPubkey}
            lastTxSig={lastTxSig}
          />
          <TableRightPanel
            phase={room.phase}
            roomPubkey={roomPubkey}
            lastTxSig={lastTxSig}
            playerCount={room.playerCount}
            variant="live"
          />
        </>
      }
    />
  );
}
