"use client";

import PlayingCard from "@/components/PlayingCard";
import { phaseLabel } from "@/lib/cards";
import type { GamePhase } from "@/lib/types";
import type { StreetReveal } from "@/hooks/useHandAnimations";

const FLOP_STAGGER_MS = 180;

export default function CommunityBoard({
  cards,
  phase,
  streetReveal,
}: {
  cards: number[];
  phase: GamePhase;
  streetReveal: StreetReveal | null;
}) {
  if (cards.length === 0) {
    return <span className="premium-phase-pill">{phaseLabel(phase)}</span>;
  }

  return (
    <div className="premium-community-row flex justify-center gap-1.5">
      {cards.map((card, index) => {
        const isNew =
          streetReveal != null &&
          index >= streetReveal.startIndex &&
          index < streetReveal.startIndex + streetReveal.count;
        const stagger = isNew
          ? (index - (streetReveal?.startIndex ?? 0)) * FLOP_STAGGER_MS
          : 0;

        return (
          <div
            key={`${card}-${index}`}
            className={`premium-card-anim-wrap${isNew ? " premium-card-flop-reveal" : ""}`}
            style={isNew ? { animationDelay: `${stagger}ms` } : undefined}
          >
            <PlayingCard card={card} />
          </div>
        );
      })}
      {phase === "turn" && cards.length === 3 && (
        <div className="premium-board-slot" aria-hidden />
      )}
      {phase === "river" && cards.length === 4 && (
        <div className="premium-board-slot" aria-hidden />
      )}
    </div>
  );
}
