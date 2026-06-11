"use client";

import { useEffect, useState } from "react";
import {
  ACTION_TIMER_SECONDS,
  isTurnExpired,
  secondsRemaining,
  turnProgress,
  turnTimerPhase,
  type TurnTimerPhase,
} from "@/lib/game/turnTimer";

export function useTurnTimer(
  active: boolean,
  turnStartedAt?: number,
  timeBankMs = 0
) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !turnStartedAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active, turnStartedAt]);

  const phase: TurnTimerPhase =
    active && turnStartedAt ? turnTimerPhase(turnStartedAt, timeBankMs, now) : "action";
  const secondsLeft =
    active && turnStartedAt
      ? secondsRemaining(turnStartedAt, timeBankMs, now)
      : ACTION_TIMER_SECONDS;
  const progress =
    active && turnStartedAt ? turnProgress(turnStartedAt, timeBankMs, now) : 1;
  const expired =
    active && turnStartedAt ? isTurnExpired(turnStartedAt, timeBankMs, now) : false;
  const urgent = active && (phase === "bank" || secondsLeft <= 3);

  return { secondsLeft, progress, expired, urgent, phase };
}
