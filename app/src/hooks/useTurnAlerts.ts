"use client";

import { useEffect, useRef } from "react";

const DEFAULT_TITLE = "SolanaWSOP";

export function useTurnAlerts({
  enabled,
  isMyTurn,
  turnKey,
}: {
  enabled: boolean;
  isMyTurn: boolean;
  turnKey: string;
}) {
  const lastNotifiedKey = useRef("");
  const titleTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    if (Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isMyTurn || !turnKey) return;
    if (turnKey === lastNotifiedKey.current) return;
    lastNotifiedKey.current = turnKey;

    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try {
        new Notification("Your turn", {
          body: "Action required at the demo table",
          tag: "wsop-your-turn",
        });
      } catch {
        // ignore
      }
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([80, 40, 80]);
    }
  }, [enabled, isMyTurn, turnKey]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    if (titleTimer.current) {
      window.clearInterval(titleTimer.current);
      titleTimer.current = null;
    }

    if (!enabled || !isMyTurn) {
      document.title = DEFAULT_TITLE;
      return;
    }

    let on = true;
    document.title = "▶ YOUR TURN — SolanaWSOP";
    titleTimer.current = window.setInterval(() => {
      document.title = on ? "▶ YOUR TURN — SolanaWSOP" : DEFAULT_TITLE;
      on = !on;
    }, 900);

    return () => {
      if (titleTimer.current) window.clearInterval(titleTimer.current);
      document.title = DEFAULT_TITLE;
    };
  }, [enabled, isMyTurn]);
}
