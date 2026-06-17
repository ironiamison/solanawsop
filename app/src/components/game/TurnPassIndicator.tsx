"use client";

import { useEffect, useRef, useState } from "react";
import type { GamePhase } from "@/lib/types";
import { SEAT_COORDS, seatCoordStyle, clockwisePath, visualSeat } from "./seatCoords";

const HOP_MS = 85;

export default function TurnPassIndicator({
  currentTurnSeat,
  mySeat,
  phase,
}: {
  currentTurnSeat: number;
  mySeat: number | null;
  phase: GamePhase;
}) {
  const [displaySeat, setDisplaySeat] = useState(currentTurnSeat);
  const [hopping, setHopping] = useState(false);
  const prevTurn = useRef<number | null>(null);
  const hopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hopTimer.current) {
      clearTimeout(hopTimer.current);
      hopTimer.current = null;
    }

    if (phase === "waiting" || phase === "showdown") {
      prevTurn.current = null;
      setHopping(false);
      setDisplaySeat(currentTurnSeat);
      return;
    }

    const prev = prevTurn.current;
    prevTurn.current = currentTurnSeat;

    if (prev === null || prev === currentTurnSeat) {
      setDisplaySeat(currentTurnSeat);
      return;
    }

    const path = clockwisePath(prev, currentTurnSeat);
    let step = 0;
    setHopping(true);
    setDisplaySeat(prev);

    const hop = () => {
      if (step >= path.length) {
        setHopping(false);
        return;
      }
      setDisplaySeat(path[step]);
      step += 1;
      hopTimer.current = setTimeout(hop, HOP_MS);
    };

    hopTimer.current = setTimeout(hop, HOP_MS);

    return () => {
      if (hopTimer.current) clearTimeout(hopTimer.current);
    };
  }, [currentTurnSeat, phase]);

  if (phase === "waiting" || phase === "showdown") return null;

  const visual = visualSeat(displaySeat, mySeat);
  const coord = SEAT_COORDS[visual];

  return (
    <div
      className={`premium-turn-pointer${hopping ? " premium-turn-pointer-hopping" : ""}`}
      style={seatCoordStyle(coord)}
      aria-hidden
    >
      <span className="premium-turn-pointer-core" />
      <span className="premium-turn-pointer-ring" />
      <span className="premium-turn-pointer-trail" />
    </div>
  );
}
