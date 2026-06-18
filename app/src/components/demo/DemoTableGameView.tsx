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
import DemoReactionFloat from "@/components/demo/DemoReactionFloat";
import DemoTableVibes from "@/components/demo/DemoTableVibes";
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
import type { BotDifficulty, DemoAction, DemoRole, DemoRoomView } from "@/lib/demo/types";
import type { ChatMessage } from "@/hooks/useSocket";
import { useTurnTimer } from "@/hooks/useTurnTimer";
import { useHandRewards } from "@/hooks/useHandRewards";
import { useHandWinCelebration } from "@/hooks/useHandWinCelebration";
import { useTurnAlerts } from "@/hooks/useTurnAlerts";
import { useGameSounds } from "@/hooks/useGameSounds";

export type DemoTableGame = {
  connected: boolean;
  view: DemoRoomView | null;
  sessionId: string | null;
  roomId?: string;
  role: DemoRole | null;
  username: string;
  joinNotice: string | null;
  messages: ChatMessage[];
  actionPending: boolean;
  leaveSeat: () => Promise<void>;
  takeSeat: () => Promise<void>;
  startHand: () => Promise<void>;
  setSitOut: (sitOut: boolean) => Promise<{ ok: boolean; error?: string }>;
  sendAction: (action: DemoAction) => Promise<{ ok: boolean; error?: string }>;
  sendMessage: (text: string, avatar?: string) => Promise<void>;
  rebuy: () => Promise<{ ok: boolean; error?: string }>;
  setBotDifficulty: (d: BotDifficulty) => Promise<{ ok: boolean }>;
  socket: React.RefObject<import("socket.io-client").Socket | null>;
  seatDesync?: boolean;
  reconnectSeat?: () => Promise<void>;
};

export default function DemoTableGameView({
  game,
  tableTitle,
  buyInLabel,
  blindsLabel,
  roomId: roomIdOverride,
  hideChat = false,
}: {
  game: DemoTableGame;
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
    roomId: gameRoomId,
    role,
    username,
    joinNotice,
    messages,
    actionPending,
    seatDesync = false,
    reconnectSeat = async () => {},
    leaveSeat,
    takeSeat,
    startHand,
    setSitOut,
    sendAction,
    sendMessage,
    rebuy,
    setBotDifficulty,
    socket,
  } = game;

  const activeRoomId = roomIdOverride ?? gameRoomId ?? DEMO_ROOM_ID;

  const [betAmount, setBetAmount] = useState(0);
  const [dealCountdown, setDealCountdown] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const lastBetTurnKey = useRef("");
  const lastTurnSoundKey = useRef("");
  const lastWinHand = useRef(0);
  const lastDealHand = useRef(0);

  const { play, setEnabled: setSoundPersist } = useGameSounds();

  useEffect(() => {
    try {
      setSoundEnabled(localStorage.getItem("wsop_sound_enabled") !== "0");
    } catch {
      // ignore
    }
  }, []);

  const runAction = async (action: Parameters<typeof sendAction>[0]) => {
    const res = await sendAction(action);
    if (!res.ok) setActionError(res.error ?? "Action failed");
    else {
      setActionError(null);
      if (soundEnabled) play("action");
    }
  };

  const myPubkey = sessionId ? sessionToPubkey(sessionId) : null;
  const room = view ? demoViewToRoom(view) : null;
  const players = view ? demoViewToPlayers(view) : [];
  const nameOverrides = view ? demoNameOverrides(view) : {};
  const avatarOverrides = view ? demoAvatarOverrides(view) : {};
  const sittingOutOverrides = view ? demoSittingOutOverrides(view) : {};

  const myDemoPlayer = sessionId
    ? view?.players.find((p) => p.sessionId === sessionId)
    : undefined;
  const myPlayer = myDemoPlayer
    ? players.find((p) => p.seat === myDemoPlayer.seat)
    : myPubkey
      ? players.find((p) => p.wallet.equals(myPubkey))
      : undefined;

  useHandRewards({
    handNumber: view?.handNumber,
    source: "demo",
    isSeated: role === "player" && !!myPlayer,
    phase: view?.phase,
  });

  const isBettingPhase =
    room?.phase === "preFlop" ||
    room?.phase === "flop" ||
    room?.phase === "turn" ||
    room?.phase === "river";

  const isMyTurn =
    !!myPlayer &&
    myDemoPlayer?.status === "active" &&
    !!room &&
    isBettingPhase &&
    room.currentTurnSeat === myPlayer.seat;

  const turnAlertKey = `${view?.handNumber ?? 0}-${room?.currentTurnSeat ?? 0}-${view?.turnStartedAt ?? 0}`;

  useTurnAlerts({
    enabled: role === "player",
    isMyTurn: !!isMyTurn,
    turnKey: turnAlertKey,
  });

  useEffect(() => {
    if (!isMyTurn || !soundEnabled) return;
    if (turnAlertKey === lastTurnSoundKey.current) return;
    lastTurnSoundKey.current = turnAlertKey;
    play("turn");
  }, [isMyTurn, turnAlertKey, soundEnabled, play]);

  useEffect(() => {
    const win = view?.lastHandWin;
    if (!win || !sessionId) return;
    if (!win.winnerSessionIds.includes(sessionId)) return;
    if (win.handNumber === lastWinHand.current) return;
    lastWinHand.current = win.handNumber;
    if (soundEnabled) play("win");
  }, [view?.lastHandWin, sessionId, soundEnabled, play]);

  useEffect(() => {
    const n = view?.handNumber ?? 0;
    if (!soundEnabled || view?.phase !== "preFlop" || n <= 0) return;
    if (n === lastDealHand.current) return;
    lastDealHand.current = n;
    play("deal");
  }, [view?.handNumber, view?.phase, soundEnabled, play]);

  const turnTimerActive = !!(isMyTurn && myPlayer && view?.turnStartedAt);
  const { secondsLeft, progress, urgent, phase: timerPhase } =
    useTurnTimer(turnTimerActive, view?.turnStartedAt, myDemoPlayer?.timeBankMs ?? 0);

  const { winToast, dismissWinToast } = useHandWinCelebration(
    view?.lastHandWin,
    sessionId
  );

  const inHand = !!myPlayer && room && room.phase !== "waiting";

  const callAmount =
    myPlayer && room
      ? Math.min(Math.max(0, room.currentBet - myPlayer.roundBet), myPlayer.stack)
      : 0;

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

  const readyToDeal =
    !!room &&
    !!view &&
    room.phase === "waiting" &&
    view.playerCount >= 2 &&
    role === "player" &&
    !!myPlayer;

  const statusLine = useMemo(() => {
    if (!view) return null;
    if (dealCountdown && view.phase === "waiting") {
      return `Dealing in ${dealCountdown}s…`;
    }
    if (readyToDeal && !dealCountdown && !view.autoDealAt) {
      return "2 players ready — tap Start hand or wait for auto-deal";
    }
    if (view.botsOnlyTable) {
      return "Bots practice — you vs AI opponents. Tune difficulty below.";
    }
    if (myDemoPlayer?.sitOutNextHand && view.phase === "waiting") {
      return "You're sitting out — tap I'm back to join the next hand.";
    }
    if (role === "spectator" && isFull) {
      return "Table full — spectating until a seat opens.";
    }
    return null;
  }, [view, role, isFull, dealCountdown, readyToDeal, myDemoPlayer?.sitOutNextHand]);

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
      {seatDesync && (
        <div className="mx-4 mt-2 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <span>Your seat lost sync — reconnect to play.</span>
          <button
            type="button"
            onClick={() => void reconnectSeat()}
            className="rounded-md bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-50 hover:bg-amber-500/30"
          >
            Reconnect seat
          </button>
        </div>
      )}
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
            {(myDemoPlayer?.stack ?? 0) === 0 && (
              <TableControlBtn variant="primary" onClick={() => void rebuy()}>
                Reload chips
              </TableControlBtn>
            )}
            {readyToDeal && (
              <TableControlBtn variant="primary" onClick={() => void startHand()}>
                Start hand
              </TableControlBtn>
            )}
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
      stack={myPlayer?.stack ?? myDemoPlayer?.stack ?? 100_000_000_000}
      topBanner={topBanner}
      tableArea={
        <div className="relative h-full w-full">
          <DemoReactionFloat messages={messages} roomId={activeRoomId} />
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
          actingTimeBankMs={
            view.players.find((p) => p.seat === room.currentTurnSeat)?.timeBankMs ?? 0
          }
        />
        </div>
      }
      actionBar={
        <>
          <DemoTableVibes
            disabled={!connected}
            botDifficulty={view.botDifficulty ?? "standard"}
            soundEnabled={soundEnabled}
            onSend={(text) => sendMessage(text, playerAvatarUrl(username))}
            onBotDifficultyChange={(d) => void setBotDifficulty(d)}
            onSoundToggle={(on) => {
              setSoundEnabled(on);
              setSoundPersist(on);
            }}
          />
          <ActionPanel
          visible={!!(isMyTurn && myPlayer)}
          showShell={false}
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
        </>
      }
      chatDock={
        hideChat ? undefined : (
          <TableChatDock
            connected={connected}
            messages={messages}
            wallet={sessionId}
            roomId={activeRoomId}
            socket={socket}
            onSend={(text) => sendMessage(text, playerAvatarUrl(username))}
          />
        )
      }
      rightPanel={
        <TableRightPanel
          variant="demo"
          phase={room.phase}
          roomPubkey={activeRoomId}
          playerCount={view.playerCount}
          spectatorCount={spectatorCount}
          spectatorNames={view.spectators.map((s) => s.username)}
          seatedPlayers={view.players.map((p) => ({
            name: p.username,
            stack: p.stack,
            avatar: playerAvatarUrl(p.username),
          }))}
          handHistory={view.handHistory ?? []}
          mySessionId={sessionId}
        />
      }
    />
    </>
  );
}
