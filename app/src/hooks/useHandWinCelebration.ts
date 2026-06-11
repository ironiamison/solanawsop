"use client";

import { useEffect, useRef, useState } from "react";
import { playPokerSound } from "@/lib/game/pokerSounds";
import type { DemoHandWin } from "@/lib/demo/types";

export function useHandWinCelebration(
  lastHandWin: DemoHandWin | null | undefined,
  sessionId: string | null
) {
  const seenHand = useRef(0);
  const [toast, setToast] = useState<{
    pot: number;
    split: boolean;
  } | null>(null);

  useEffect(() => {
    if (!lastHandWin || !sessionId) return;
    if (lastHandWin.handNumber <= seenHand.current) return;

    seenHand.current = lastHandWin.handNumber;
    const won = lastHandWin.winnerSessionIds.includes(sessionId);
    if (!won) return;

    const split = lastHandWin.winnerSessionIds.length > 1;
    playPokerSound("win");
    setToast({ pot: lastHandWin.pot, split });

    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [lastHandWin, sessionId]);

  return {
    winToast: toast,
    dismissWinToast: () => setToast(null),
  };
}
