"use client";

import { useEffect, useRef, useState } from "react";
import type { GamePhase } from "@/lib/types";

const DEAL_MS = 1400;
const STREET_REVEAL_MS = 1100;

export interface StreetReveal {
  nonce: number;
  startIndex: number;
  count: number;
}

export function useHandAnimations(phase: GamePhase, communityCount: number) {
  const prevPhase = useRef(phase);
  const prevCommunityCount = useRef(communityCount);
  const [dealHandId, setDealHandId] = useState(0);
  const [isDealing, setIsDealing] = useState(false);
  const [streetReveal, setStreetReveal] = useState<StreetReveal | null>(null);

  useEffect(() => {
    if (prevPhase.current === "waiting" && phase === "preFlop") {
      setDealHandId((id) => id + 1);
      setIsDealing(true);
      const t = window.setTimeout(() => setIsDealing(false), DEAL_MS);
      prevPhase.current = phase;
      return () => clearTimeout(t);
    }
    prevPhase.current = phase;
  }, [phase]);

  useEffect(() => {
    if (communityCount > prevCommunityCount.current) {
      const count = communityCount - prevCommunityCount.current;
      const startIndex = prevCommunityCount.current;
      setStreetReveal({
        nonce: Date.now(),
        startIndex,
        count,
      });
      const t = window.setTimeout(() => setStreetReveal(null), STREET_REVEAL_MS);
      prevCommunityCount.current = communityCount;
      return () => clearTimeout(t);
    }
    if (communityCount < prevCommunityCount.current) {
      prevCommunityCount.current = communityCount;
    }
  }, [communityCount]);

  useEffect(() => {
    if (phase === "waiting") {
      prevCommunityCount.current = 0;
      setStreetReveal(null);
      setIsDealing(false);
    }
  }, [phase]);

  return { dealHandId, isDealing, streetReveal };
}
