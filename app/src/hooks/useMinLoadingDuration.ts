"use client";

import { useEffect, useState } from "react";

/** Minimum time the loading lobby stays visible (ms) */
export const MIN_LOADING_SCREEN_MS = 5500;

const LOBBY_INTRO_KEY = "wsop_lobby_intro_seen";

function introAlreadySeen(resetKey?: string | number | null): boolean {
  if (typeof window === "undefined") return false;
  if (resetKey != null && resetKey !== "") return false;
  return sessionStorage.getItem(LOBBY_INTRO_KEY) === "1";
}

/**
 * Returns false until `ms` has elapsed. Pass `resetKey` to restart the timer
 * when entering a new loading flow (e.g. new table or demo session).
 * Skips the intro delay when returning in the same session (e.g. after X OAuth).
 */
export function useMinLoadingDuration(
  ms = MIN_LOADING_SCREEN_MS,
  resetKey?: string | number | null
) {
  const [elapsed, setElapsed] = useState(() => introAlreadySeen(resetKey));

  useEffect(() => {
    if (introAlreadySeen(resetKey)) {
      setElapsed(true);
      return;
    }
    setElapsed(false);
    const id = setTimeout(() => {
      if (resetKey == null || resetKey === "") {
        sessionStorage.setItem(LOBBY_INTRO_KEY, "1");
      }
      setElapsed(true);
    }, ms);
    return () => clearTimeout(id);
  }, [ms, resetKey]);

  return elapsed;
}
