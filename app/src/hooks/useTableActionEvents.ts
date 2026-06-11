"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GamePhase, PlayerState } from "@/lib/types";
import type { PokerSound } from "@/lib/game/pokerSounds";

export interface ChipFly {
  id: number;
  visualSeat: number;
  chipCount: number;
  /** Seat → pot (default) or pot → seat */
  direction?: "to-pot" | "from-pot";
}

interface PlayerSnap {
  roundBet: number;
  status: PlayerState["status"];
  hasActed: boolean;
}

const CHIP_FLY_MS = 620;

export function useTableActionEvents(
  players: PlayerState[],
  phase: GamePhase,
  mySeat: number | null,
  onSound?: (sound: PokerSound) => void
) {
  const prev = useRef<Map<number, PlayerSnap>>(new Map());
  const [chipFlies, setChipFlies] = useState<ChipFly[]>([]);
  const [foldingSeats, setFoldingSeats] = useState<Set<number>>(new Set());
  const flyId = useRef(0);

  const visualSeatFor = useCallback(
    (seat: number) => {
      if (mySeat === null) return seat;
      return (seat - mySeat + 6) % 6;
    },
    [mySeat]
  );

  useEffect(() => {
    if (phase === "waiting") prev.current.clear();
  }, [phase]);

  useEffect(() => {
    if (prev.current.size === 0 && players.length > 0 && phase !== "waiting") {
      prev.current = new Map(
        players.map((p) => [
          p.seat,
          { roundBet: p.roundBet, status: p.status, hasActed: p.hasActed },
        ])
      );
      return;
    }

    const nextFolding = new Set<number>();

    for (const player of players) {
      const prior = prev.current.get(player.seat);
      if (!prior) continue;

      const betDelta = player.roundBet - prior.roundBet;
      if (betDelta > 0) {
        const id = ++flyId.current;
        const chipCount = Math.min(5, Math.max(1, Math.round(Math.log10(betDelta + 1)) + 1));
        const visualSeat = visualSeatFor(player.seat);
        setChipFlies((flies) => [...flies, { id, visualSeat, chipCount }]);
        window.setTimeout(() => {
          setChipFlies((flies) => flies.filter((f) => f.id !== id));
        }, CHIP_FLY_MS);
        onSound?.("chip");
      }

      if (prior.status !== "folded" && player.status === "folded") {
        nextFolding.add(player.seat);
        onSound?.("fold");
      }

      if (
        !prior.hasActed &&
        player.hasActed &&
        player.status === "active" &&
        betDelta === 0 &&
        player.roundBet >= 0
      ) {
        const wasCheck = player.roundBet === prior.roundBet;
        if (wasCheck) onSound?.("check");
      }
    }

    if (nextFolding.size > 0) {
      setFoldingSeats(nextFolding);
      const t = window.setTimeout(() => setFoldingSeats(new Set()), 700);
      prev.current = new Map(
        players.map((p) => [
          p.seat,
          { roundBet: p.roundBet, status: p.status, hasActed: p.hasActed },
        ])
      );
      return () => clearTimeout(t);
    }

    prev.current = new Map(
      players.map((p) => [
        p.seat,
        { roundBet: p.roundBet, status: p.status, hasActed: p.hasActed },
      ])
    );
  }, [players, phase, visualSeatFor, onSound]);

  useEffect(() => {
    if (players.length === 0) prev.current.clear();
  }, [players.length]);

  return { chipFlies, foldingSeats };
}
