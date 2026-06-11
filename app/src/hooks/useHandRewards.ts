"use client";

import { useEffect, useRef } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import type { GamePhase } from "@/lib/types";

/** Award reward points when a seated player completes a hand */
export function useHandRewards({
  handNumber,
  source,
  isSeated,
  phase,
}: {
  handNumber?: number;
  source: "demo" | "onchain";
  isSeated: boolean;
  phase?: GamePhase;
}) {
  const { authenticated } = usePrivy();
  const authFetch = useAuthFetch();
  const lastAwarded = useRef(0);
  const prevPhase = useRef<GamePhase | null>(null);
  const onchainCounter = useRef(0);

  useEffect(() => {
    if (!authenticated || !isSeated || !phase) return;

    const handEnded =
      prevPhase.current !== null &&
      prevPhase.current !== "waiting" &&
      phase === "waiting";

    if (handEnded) {
      let awardHand: number;
      if (source === "demo" && handNumber && handNumber > 0) {
        awardHand = handNumber;
      } else {
        onchainCounter.current += 1;
        awardHand = onchainCounter.current;
      }

      if (awardHand > lastAwarded.current) {
        lastAwarded.current = awardHand;
        authFetch("/api/rewards/hand", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ handNumber: awardHand, source }),
        }).catch(() => {
          lastAwarded.current = awardHand - 1;
        });
      }
    }

    prevPhase.current = phase;
  }, [authenticated, authFetch, handNumber, isSeated, phase, source]);
}
