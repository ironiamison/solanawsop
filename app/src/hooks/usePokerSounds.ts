"use client";

import { useCallback, useState } from "react";
import {
  isSoundMuted,
  playPokerSound,
  setSoundMuted,
  type PokerSound,
} from "@/lib/game/pokerSounds";

export function usePokerSounds() {
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return true;
    return isSoundMuted();
  });

  const play = useCallback(
    (sound: PokerSound) => {
      if (muted) return;
      playPokerSound(sound);
    },
    [muted]
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      setSoundMuted(next);
      if (!next) playPokerSound("check");
      return next;
    });
  }, []);

  const enable = useCallback(() => {
    setSoundMuted(false);
    setMuted(false);
  }, []);

  return { play, muted, toggleMute, enable };
}
