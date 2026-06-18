"use client";

import { cardLabel } from "@/lib/cards";
import { formatTokens } from "@/lib/constants";
import type { DemoHandHistoryEntry } from "@/lib/demo/types";

export default function DemoHandHistoryList({
  entries,
  mySessionId,
}: {
  entries: DemoHandHistoryEntry[];
  mySessionId?: string | null;
}) {
  if (!entries.length) {
    return (
      <p className="text-[10px] leading-relaxed text-zinc-600">
        Last 10 completed hands appear here.
      </p>
    );
  }

  return (
    <ul className="demo-hand-history space-y-2">
      {entries.map((hand) => {
        const board = hand.communityCards
          .filter((c) => c < 52)
          .map((c) => cardLabel(c))
          .join(" ");
        const mine = hand.showdown?.find((s) => s.sessionId === mySessionId);
        return (
          <li key={`${hand.handNumber}-${hand.endedAt}`} className="demo-hand-history-item">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-violet-200">#{hand.handNumber}</span>
              <span className="tabular-nums text-emerald-400/90">
                {formatTokens(hand.pot)}
              </span>
            </div>
            <p className="mt-0.5 truncate text-[10px] text-zinc-400">
              {hand.winnerUsernames.join(", ")}
            </p>
            {board && (
              <p className="mt-0.5 font-mono text-[9px] text-zinc-500">{board}</p>
            )}
            {mine && mine.holeCards[0] < 52 && (
              <p className="mt-0.5 font-mono text-[9px] text-violet-300/80">
                You: {cardLabel(mine.holeCards[0])} {cardLabel(mine.holeCards[1])}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
