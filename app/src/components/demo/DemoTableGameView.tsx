"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PokerTable from "@/components/PokerTable";
import GameplayLayout from "@/components/game/GameplayLayout";
import TableRightPanel from "@/components/game/TableRightPanel";
import TableChatDock from "@/components/game/TableChatDock";
import ActionPanel from "@/components/game/ActionPanel";
import HandWinToast from "@/components/game/HandWinToast";
import LoadingLobby from "@/components/loading/LoadingLobby";
import TableControls, { TableControlBtn } from "@/components/game/TableControls";
import { BRAND_NAME, formatTokens, TOKEN_SYMBOL } from "@/lib/constants";
import { evaluateHand } from "@/lib/demo/handEval";
import {
  demoAvatarOverrides,
  demoNameOverrides,
  demoSittingOutOverrides,
  demoViewToPlayers,
  demoViewToRoom,
} from "@/lib/demo/adapter";
import { playerAvatarUrl } from "@/lib/avatars";
import { DEMO_BIG_BLIND, DEMO_ROOM_ID, DEMO_SMALL_BLIND } from "@/lib/demo/constants";
import { sessionToPubkey } from "@/lib/demo/ids";
import { handRankLabel } from "@/lib/handNames";
import type { useDemoGame } from "@/hooks/useDemoGame";
import { useTurnTimer } from "@/hooks/useTurnTimer";
import { useHandRewards } from "@/hooks/useHandRewards";
import { useHandWinCelebration } from "@/hooks/useHandWinCelebration";

type DemoGame = ReturnType<typeof useDemoGame>;

export default function DemoTableGameView({
  game,
  tableTitle,
  buyInLabel,
  blindsLabel,
  roomId: roomIdOverride,
  hideChat = false,
}: {
  game: DemoGame;
  tableTitle?: string;
  buyInLabel?: string;
  blindsLabel?: string;
  roomId?: string;
  hideChat?: boolean;
}) {
  const {
    connected,
    view,
    sessionId,
    role,
    username,
    joinNotice,
    messages,
    actionPending,
    leaveSeat,
    takeSeat,
    setSitOut,
    sendAction,
    sendMessage,
    socket,
  } = game;

  const [betAmount, setBetAmount] = useState(0);
  const [dealCountdown, setDealCountdown] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const autoFoldSent = useRef(false);
  const lastBetTurnKey = useRef("");

  const runAction = async (action: Parameters<typeof sendAction>[0]) => {
    const res = await sendAction(action);
    if (!res.ok) setActionError(res.error ?? "Action failed");
    else setActionError(null);
  };

  const myPubkey = sessionId ? sessionToPubkey(sessionId) : null;
  const room = view ? demoViewToRoom(view) : null;
  const players = view ? demoViewToPlayers(view) : [];
  const nameOverrides = view ? demoNameOverrides(view) : {};
  const avatarOverrides = view ? demoAvatarOverrides(view) : {};
  const sittingOutOverrides = view ? demoSittingOutOverrides(view) : {};

  const myPlayer = myPubkey
    ? players.find((p) => p.wallet.equals(myPubkey))
    : undefined;
  const myDemoPlayer = sessionId
    ? view?.players.find((p) => p.sessionId === sessionId)
    : undefined;

  useHandRewards({
    handNumber: view?.handNumber,
    source: "demo",
    isSeated: role === "player" && !!myPlayer,
    phase: view?.phase,
  });

  const isMyTurn =
    myPlayer &&
    room &&
    room.currentTurnSeat === myPlayer.seat &&
    room.phase !== "waiting";

  const turnTimerActive = !!(isMyTurn && myPlayer && view?.turnStartedAt);
  const { secondsLeft, progress, expired, urgent, phase: timerPhase } =
    useTurnTimer(turnTimerActive, view?.turnStartedAt, myDemoPlayer?.timeBankMs ?? 0);

  const { winToast, dismissWinToast } = useHandWinCelebration(
    view?.lastHandWin,
    sessionId
  );

  const inHand = !!myPlayer && room && room.phase !== "waiting";

  const callAmount =
    myPlayer && room ? Math.max(0, room.currentBet - myPlayer.roundBet) : 0;

  useEffect(() => {
    if (!myPlayer || !room || !isMyTurn) return;
    const turnKey = `${room.phase}-${room.currentTurnSeat}-${view?.turnStartedAt}`;
    if (turnKey === lastBetTurnKey.current) return;
    lastBetTurnKey.current = turnKey;

    const minRaise = room.minRaise || DEMO_BIG_BLIND;
    const maxRaiseTo = myPlayer.roundBet + myPlayer.stack;
    const minRaiseTo =
      room.currentBet === 0
        ? Math.min(maxRaiseTo, minRaise)
        : Math.min(maxRaiseTo, room.currentBet + minRaise);
    setBetAmount(minRaiseTo);
  }, [myPlayer, room, isMyTurn, view?.turnStartedAt]);

  useEffect(() => {
    autoFoldSent.current = false;
  }, [view?.turnStartedAt, view?.currentTurnSeat, view?.phase]);

  useEffect(() => {
    if (!expired || !isMyTurn || !myPlayer || actionPending || autoFoldSent.current) return;
    autoFoldSent.current = true;
    runAction({ type: "fold" });
  }, [expired, isMyTurn, myPlayer, actionPending]);

  const spectatorCount = view?.spectators.length ?? 0;
  const isFull = (view?.playerCount ?? 0) >= 6;

  const potWin = useMemo(() => {
    const win = view?.lastHandWin;
    if (!win) return null;
    const seats = win.winnerSessionIds
      .map((sid) => view.players.find((p) => p.sessionId === sid)?.seat)
      .filter((s): s is number => s !== undefined);
    if (seats.length === 0) return null;
    return { handNumber: win.handNumber, winnerSeats: seats, pot: win.pot };
  }, [view?.lastHandWin, view?.players]);

  const heroHandLabel = useMemo(() => {
    if (!myPlayer || myPlayer.holeCards[0] >= 52) return null;
    const community = room?.communityCards.slice(0, room.communityCount).filter((c) => c < 52) ?? [];
    if (community.length === 0 && room?.phase === "preFlop") return null;
    const rank = evaluateHand(
      [myPlayer.holeCards[0], myPlayer.holeCards[1]],
      community
    );
    return handRankLabel(rank).toUpperCase();
  }, [myPlayer, room]);

  useEffect(() => {
    const at = view?.autoDealAt;
    if (!at || view?.phase !== "waiting") {
      setDealCountdown(null);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((at - Date.now()) / 1000));
      setDealCountdown(left > 0 ? left : null);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [view?.autoDealAt, view?.phase]);

  const statusLine = useMemo(() => {
    if (!view) return null;
    if (dealCountdown && view.phase === "waiting") {
      return `Next hand deals in ${dealCountdown}s…`;
    }
    if (view.statusMessage) return view.statusMessage;
    if (myDemoPlayer?.sitOutNextHand && view.phase === "waiting") {
      return "You're sitting out — tap I'm back to join the next hand.";
    }
    if (role === "spectator" && isFull) {
      return "Table full — spectating until a seat opens.";
    }
    return null;
  }, [view, role, isFull, dealCountdown, myDemoPlayer?.sitOutNextHand]);

  if (!view || !room || !sessionId) {
    return (
      <LoadingLobby
        subtitle={connected ? "Syncing demo table…" : "Connecting to game server…"}
        tablesActive={1}
      />
    );
  }

  const topBanner = (
    <>
      {joinNotice && (
        <div className="mx-4 mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
          {joinNotice}
        </div>
      )}
      {statusLine && (
        <p className="py-1 text-center text-xs text-violet-300/90">{statusLine}</p>
      )}
      {actionError && (
        <div className="mx-4 mt-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-center text-xs text-red-300">
          {actionError}
        </div>
      )}
      <TableControls>
        {role === "spectator" && room.phase === "waiting" && !isFull && (
          <TableControlBtn onClick={takeSeat}>Take a seat</TableControlBtn>
        )}
        {myPlayer && room.phase === "waiting" && (
          <>
            <TableControlBtn variant="danger" onClick={leaveSeat}>
              Leave seat
            </TableControlBtn>
            <TableControlBtn
              variant={myDemoPlayer?.sitOutNextHand ? "primary" : "ghost"}
              onClick={() => void setSitOut(!myDemoPlayer?.sitOutNextHand)}
            >
              {myDemoPlayer?.sitOutNextHand ? "I'm back" : "Sit out"}
            </TableControlBtn>
          </>
        )}
      </TableControls>
    </>
  );

  const maxRaiseTo = (myPlayer?.roundBet ?? 0) + (myPlayer?.stack ?? 0);
  const minRaiseTo =
    room.currentBet === 0
      ? Math.min(maxRaiseTo, room.minRaise || DEMO_BIG_BLIND)
      : Math.min(maxRaiseTo, room.currentBet + (room.minRaise || DEMO_BIG_BLIND));
  const clampedBet = Math.min(maxRaiseTo, Math.max(minRaiseTo, betAmount));

  return (
    <>
      {winToast && (
        <HandWinToast
          pot={winToast.pot}
          split={winToast.split}
          onDismiss={dismissWinToast}
        />
      )}
    <GameplayLayout
      isDemo
      tableTitle={tableTitle ?? `${BRAND_NAME} Free Play`}
      blindsLabel={
        blindsLabel ??
        `${formatTokens(DEMO_SMALL_BLIND)} / ${formatTokens(DEMO_BIG_BLIND)}`
      }
      buyInLabel={buyInLabel ?? `100K play ${TOKEN_SYMBOL}`}
      playerCount={view.playerCount}
      userLabel={username}
      stack={myPlayer?.stack ?? 100_000_000_000}
      topBanner={topBanner}
      tableArea={
        <PokerTable
          room={room}
          players={players}
          myWallet={myPubkey ?? undefined}
          nameOverrides={nameOverrides}
          avatarOverrides={avatarOverrides}
          sittingOutOverrides={sittingOutOverrides}
          potWin={potWin}
          heroHandLabel={heroHandLabel}
          fairnessMode="demo"
        />
      }
      actionBar={
        <ActionPanel
          visible={!!(isMyTurn && myPlayer)}
          showShell={!!inHand}
          timerSecondsLeft={turnTimerActive ? secondsLeft : undefined}
          timerProgress={turnTimerActive ? progress : undefined}
          timerUrgent={urgent}
          timerLabel={timerPhase === "bank" ? "Time bank" : "Your move"}
          canCheck={myPlayer ? myPlayer.roundBet >= room.currentBet : false}
          callAmount={callAmount}
          pot={room.pot}
          stack={myPlayer?.stack ?? 0}
          roundBet={myPlayer?.roundBet ?? 0}
          minRaise={room.minRaise || DEMO_BIG_BLIND}
          currentBet={room.currentBet}
          betAmount={clampedBet}
          onBetAmountChange={(n) => setBetAmount(n)}
          onFold={() => runAction({ type: "fold" })}
          onCheck={() => runAction({ type: "check" })}
          onCall={() => runAction({ type: "call" })}
          onRaise={() => {
            const raiseIncrement = clampedBet - room.currentBet;
            runAction({ type: "raise", amount: raiseIncrement });
          }}
          pending={actionPending}
        />
      }
      chatDock={
        hideChat ? undefined : (
          <TableChatDock
            connected={connected}
            messages={messages}
            wallet={sessionId}
            roomId={roomIdOverride ?? DEMO_ROOM_ID}
            socket={socket}
            onSend={(text) => sendMessage(text, playerAvatarUrl(username))}
          />
        )
      }
      rightPanel={
        <TableRightPanel
          variant="demo"
          phase={room.phase}
          roomPubkey={DEMO_ROOM_ID}
          playerCount={view.playerCount}
          spectatorCount={spectatorCount}
          spectatorNames={view.spectators.map((s) => s.username)}
          seatedPlayers={view.players.map((p) => ({
            name: p.username,
            stack: p.stack,
            avatar: playerAvatarUrl(p.username),
          }))}
        />
      }
    />
    </>
  );
}
