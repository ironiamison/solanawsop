"use client";

import { useEffect, useRef, useState } from "react";
import { PlayerState, RoomState } from "@/lib/types";
import { isEmptySeat } from "@/lib/decode";
import { PublicKey } from "@solana/web3.js";
import PlayerSeat from "./game/PlayerSeat";
import TableScene from "./game/TableScene";
import PotDisplay from "./game/PotDisplay";
import TurnPassIndicator from "./game/TurnPassIndicator";
import CommunityBoard from "./game/CommunityBoard";
import DealFlash from "./game/DealFlash";
import { SEAT_COORDS, seatCoordStyle, visualSeat } from "./game/seatCoords";
import ChipFlyLayer from "./game/ChipFlyLayer";
import TableSoundToggle from "./game/TableSoundToggle";
import { useHandAnimations } from "@/hooks/useHandAnimations";
import { usePokerSounds } from "@/hooks/usePokerSounds";
import { useTableActionEvents } from "@/hooks/useTableActionEvents";
import { usePotWinFly, type PotWinFlyTarget } from "@/hooks/usePotWinFly";
import { useTurnTimer } from "@/hooks/useTurnTimer";
import { showdownRevealOrder } from "@/lib/game/showdownOrder";
import { formatTokens } from "@/lib/constants";
import FairnessBadge from "./game/FairnessBadge";
import type { FairnessMode } from "@/lib/fairness/modes";

interface Props {
  room: RoomState;
  players: PlayerState[];
  myWallet?: PublicKey;
  nameOverrides?: Record<string, string>;
  avatarOverrides?: Record<string, string>;
  waitingLabel?: string;
  heroHandLabel?: string | null;
  /** Center badge while waiting — omit to hide */
  fairnessMode?: FairnessMode;
  sittingOutOverrides?: Record<string, boolean>;
  potWin?: PotWinFlyTarget | null;
  formatAmount?: (n: number) => string;
  /** Time bank (ms) for the player whose turn it is — keeps seat timer in sync */
  actingTimeBankMs?: number;
}

export default function PokerTable({
  room,
  players,
  myWallet,
  nameOverrides,
  avatarOverrides,
  waitingLabel,
  heroHandLabel,
  fairnessMode,
  sittingOutOverrides,
  potWin,
  formatAmount = formatTokens,
  actingTimeBankMs = 0,
}: Props) {
  const community = room.communityCards
    .slice(0, room.communityCount)
    .filter((c) => c < 52);

  const playerByWallet = new Map(
    players.map((p) => [p.wallet.toBase58(), p])
  );
  const mySeat = myWallet
    ? (players.find((p) => p.wallet.equals(myWallet))?.seat ?? null)
    : null;

  const playerAtSeat = (seatIndex: number): PlayerState | undefined => {
    const seatPk = room.seats[seatIndex];
    if (!seatPk || isEmptySeat(seatPk)) return undefined;
    return playerByWallet.get(seatPk.toBase58());
  };

  const [feltPulse, setFeltPulse] = useState(false);
  const [potPulse, setPotPulse] = useState(false);
  const prevTurnSeat = useRef(room.currentTurnSeat);
  const wasDealing = useRef(false);
  const prevPhase = useRef(room.phase);
  const { play, muted, toggleMute } = usePokerSounds();

  const turnTimerActive =
    room.phase !== "waiting" &&
    room.phase !== "showdown" &&
    !!room.turnStartedAt;
  const { secondsLeft: turnSecondsLeft, progress: turnProgress } = useTurnTimer(
    turnTimerActive,
    room.turnStartedAt,
    actingTimeBankMs
  );
  const { dealHandId, isDealing, streetReveal } = useHandAnimations(
    room.phase,
    room.communityCount
  );
  const { chipFlies: betChipFlies, foldingSeats } = useTableActionEvents(
    players,
    room.phase,
    mySeat,
    play
  );

  const potWinFlies = usePotWinFly(potWin, mySeat, () => {
    setPotPulse(true);
    play("chip");
    window.setTimeout(() => setPotPulse(false), 520);
  });

  const chipFlies = [...betChipFlies, ...potWinFlies];

  useEffect(() => {
    if (isDealing && !wasDealing.current) play("shuffle");
    if (!isDealing && wasDealing.current && dealHandId > 0) play("deal");
    wasDealing.current = isDealing;
  }, [isDealing, dealHandId, play]);

  useEffect(() => {
    if (!streetReveal) return;
    if (streetReveal.startIndex === 0 && streetReveal.count >= 3) play("flop");
    else if (streetReveal.startIndex === 3) play("turn");
    else if (streetReveal.startIndex === 4) play("river");
  }, [streetReveal?.nonce, streetReveal, play]);

  useEffect(() => {
    if (prevPhase.current !== "showdown" && room.phase === "showdown") {
      play("showdown");
    }
    prevPhase.current = room.phase;
  }, [room.phase, play]);

  const chipFlyKey = chipFlies.map((f) => f.id).join(",");
  useEffect(() => {
    if (!chipFlyKey) return;
    setPotPulse(true);
    const t = setTimeout(() => setPotPulse(false), 500);
    return () => clearTimeout(t);
  }, [chipFlyKey]);

  useEffect(() => {
    if (room.phase === "waiting" || room.phase === "showdown") {
      prevTurnSeat.current = room.currentTurnSeat;
      setFeltPulse(false);
      return;
    }
    if (prevTurnSeat.current !== room.currentTurnSeat) {
      prevTurnSeat.current = room.currentTurnSeat;
      setFeltPulse(true);
      const t = setTimeout(() => setFeltPulse(false), 550);
      return () => clearTimeout(t);
    }
  }, [room.currentTurnSeat, room.phase]);

  useEffect(() => {
    if (!streetReveal) return;
    setFeltPulse(true);
    const t = setTimeout(() => setFeltPulse(false), 700);
    return () => clearTimeout(t);
  }, [streetReveal?.nonce]);

  return (
    <TableScene>
      <div className="premium-table-arena mx-auto w-full max-w-[980px]">
        <div className="premium-table-pad relative">
          <div className="premium-table-body relative aspect-[2.2/1] w-full">
            {/* 3D rail stack */}
            <div className="premium-rail-shadow absolute inset-0 rounded-[50%]" aria-hidden />
            <div className="premium-rail-outer absolute inset-0 rounded-[50%]" aria-hidden />
            <div className="premium-rail-bevel absolute inset-[0.4%] rounded-[50%]" aria-hidden />
            <div className="premium-rail-chrome absolute inset-[1.4%] rounded-[50%]" aria-hidden />
            <div className="premium-rail-lip absolute inset-[2.2%] rounded-[50%]" aria-hidden />

            {/* Felt */}
            <div
              className={`premium-felt absolute inset-[3.2%] rounded-[50%]${feltPulse ? " premium-felt-turn-pulse" : ""}`}
            >
              <div className="premium-felt-spotlight absolute inset-[8%] rounded-[50%]" aria-hidden />
              <div className="premium-felt-grain absolute inset-0 rounded-[50%]" aria-hidden />
              <div className="premium-felt-rim-light absolute inset-[5%] rounded-[50%]" aria-hidden />
            </div>

            <DealFlash visible={isDealing} />
            <ChipFlyLayer flies={chipFlies} />
            <TableSoundToggle muted={muted} onToggle={toggleMute} />

            {/* Center content */}
            <div className="absolute left-1/2 top-[50%] z-[15] -translate-x-1/2 -translate-y-1/2 text-center">
              {room.phase === "waiting" ? (
                fairnessMode ? (
                  <FairnessBadge mode={fairnessMode} />
                ) : (
                  <p className="max-w-[260px] text-[9px] font-bold uppercase leading-[1.8] tracking-[0.22em] text-zinc-500">
                    {waitingLabel}
                  </p>
                )
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <PotDisplay amount={room.pot} pulse={potPulse} formatAmount={formatAmount} />
                  <CommunityBoard
                    cards={community}
                    phase={room.phase}
                    streetReveal={streetReveal}
                  />
                </div>
              )}
            </div>

            <TurnPassIndicator
              currentTurnSeat={room.currentTurnSeat}
              mySeat={mySeat}
              phase={room.phase}
            />

            {room.seats.map((seatPk, seatIndex) => {
              const visual = visualSeat(seatIndex, mySeat);
              const coord = SEAT_COORDS[visual];
              const player = playerAtSeat(seatIndex);
              const seatOccupied =
                !!player || (!isEmptySeat(seatPk) && seatPk !== undefined);
              const seatWallet = player?.wallet ?? seatPk;
              const isMe =
                !!myWallet &&
                seatOccupied &&
                !isEmptySeat(seatWallet) &&
                seatWallet.equals(myWallet);
              const isTurn =
                !!player &&
                room.currentTurnSeat === player.seat &&
                room.phase !== "waiting" &&
                room.phase !== "showdown" &&
                player.status === "active";

              if (!seatOccupied) {
                return (
                  <div
                    key={seatIndex}
                    className="premium-open-seat absolute z-10"
                    style={seatCoordStyle(coord)}
                  >
                    Open seat
                  </div>
                );
              }

              const showHoleCards =
                !!isMe ||
                (room.phase === "showdown" && player?.status !== "folded");
              const isShowdownReveal =
                room.phase === "showdown" && !isMe && showHoleCards;
              const showdownDelay = isShowdownReveal
                ? showdownRevealOrder(seatIndex, room.dealerSeat, players) * 260
                : 0;

              return (
                <PlayerSeat
                  key={seatIndex}
                  wallet={seatWallet}
                  player={player}
                  isMe={!!isMe}
                  isTurn={isTurn}
                  isDealer={!!player && room.dealerSeat === player.seat}
                  showHoleCards={showHoleCards}
                  inHand={room.phase !== "waiting"}
                  currentBet={room.currentBet}
                  displayName={nameOverrides?.[seatPk.toBase58()]}
                  avatarUrl={avatarOverrides?.[seatPk.toBase58()]}
                  handLabel={isMe ? heroHandLabel : null}
                  seatStyle={seatCoordStyle(coord)}
                  folded={player?.status === "folded"}
                  turnSecondsLeft={isTurn ? turnSecondsLeft : undefined}
                  turnProgress={isTurn ? turnProgress : undefined}
                  seatIndex={seatIndex}
                  dealerSeat={room.dealerSeat}
                  dealHandId={dealHandId}
                  isDealing={isDealing}
                  isMucking={foldingSeats.has(seatIndex)}
                  isShowdownReveal={isShowdownReveal}
                  showdownRevealDelay={showdownDelay}
                  sittingOut={!!sittingOutOverrides?.[seatPk.toBase58()]}
                  formatAmount={formatAmount}
                />
              );
            })}
          </div>
        </div>
      </div>
    </TableScene>
  );
}
