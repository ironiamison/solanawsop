"use client";

import { useEffect, useState } from "react";
import {
  ACTION_TIMER_SECONDS,
  isTurnExpired,
  secondsRemaining,
  turnProgress,
} from "@/lib/game/turnTimer";

export function useTurnTimer(active: boolean, turnStartedAt?: number) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active || !turnStartedAt) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [active, turnStartedAt]);

  const secondsLeft =
    active && turnStartedAt ? secondsRemaining(turnStartedAt, now) : ACTION_TIMER_SECONDS;
  const progress = active && turnStartedAt ? turnProgress(turnStartedAt, now) : 1;
  const expired = active && turnStartedAt ? isTurnExpired(turnStartedAt, now) : false;
  const urgent = active && secondsLeft <= 10;

  return { secondsLeft, progress, expired, urgent };
}
