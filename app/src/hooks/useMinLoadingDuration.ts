"use client";

import { useEffect, useState } from "react";

/** Minimum time the loading lobby stays visible (ms) */
export const MIN_LOADING_SCREEN_MS = 8000;

/**
 * Returns false until `ms` has elapsed. Pass `resetKey` to restart the timer
 * when entering a new loading flow (e.g. new table or demo session).
 */
export function useMinLoadingDuration(
  ms = MIN_LOADING_SCREEN_MS,
  resetKey?: string | number | null
) {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    setElapsed(false);
    const id = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(id);
  }, [ms, resetKey]);

  return elapsed;
}
