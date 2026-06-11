"use client";

import { useEffect, useRef, useState } from "react";
import type { ChipFly } from "@/hooks/useTableActionEvents";
import { visualSeat } from "@/components/game/seatCoords";

export interface PotWinFlyTarget {
  handNumber: number;
  winnerSeats: number[];
  pot: number;
}

const CHIP_WIN_FLY_MS = 780;
const WIN_FLY_DELAY_MS = 280;

function chipCountForPot(pot: number): number {
  if (pot <= 0) return 4;
  const scaled = Math.log10(pot / 1_000_000 + 1);
  return Math.min(10, Math.max(4, Math.round(scaled * 2) + 3));
}

/** Animate chips from the pot center to winner seat(s) once per hand */
export function usePotWinFly(
  potWin: PotWinFlyTarget | null | undefined,
  mySeat: number | null,
  onStart?: () => void
) {
  const [flies, setFlies] = useState<ChipFly[]>([]);
  const seenHand = useRef(0);
  const flyId = useRef(0);
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;

  useEffect(() => {
    if (!potWin || potWin.winnerSeats.length === 0) return;
    if (potWin.handNumber <= seenHand.current) return;

    seenHand.current = potWin.handNumber;
    const chipCount = chipCountForPot(potWin.pot);
    const ids: number[] = [];

    const startTimer = window.setTimeout(() => {
      onStartRef.current?.();
      potWin.winnerSeats.forEach((seat, winnerIndex) => {
        const id = ++flyId.current;
        ids.push(id);
        const vs = visualSeat(seat, mySeat);
        window.setTimeout(() => {
          setFlies((current) => [
            ...current,
            { id, visualSeat: vs, chipCount, direction: "from-pot" },
          ]);
        }, winnerIndex * 120);
      });
    }, WIN_FLY_DELAY_MS);

    const cleanupTimer = window.setTimeout(() => {
      setFlies((current) => current.filter((f) => !ids.includes(f.id)));
    }, WIN_FLY_DELAY_MS + CHIP_WIN_FLY_MS + potWin.winnerSeats.length * 120 + 80);

    return () => {
      window.clearTimeout(startTimer);
      window.clearTimeout(cleanupTimer);
    };
  }, [potWin, mySeat]);

  return flies;
}
