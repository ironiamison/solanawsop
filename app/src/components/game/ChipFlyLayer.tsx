"use client";

import { SEAT_COORDS } from "./seatCoords";
import type { ChipFly } from "@/hooks/useTableActionEvents";

const CHIP_COLORS = ["#ef4444", "#f4f4f5", "#eab308", "#3b82f6", "#22c55e"];

export default function ChipFlyLayer({ flies }: { flies: ChipFly[] }) {
  if (flies.length === 0) return null;

  return (
    <div className="premium-chip-fly-layer pointer-events-none" aria-hidden>
      {flies.map((fly) => {
        const coord = SEAT_COORDS[fly.visualSeat];
        return (
          <div
            key={fly.id}
            className="premium-chip-fly-group"
            style={
              {
                "--fly-from-x": coord.left,
                "--fly-from-y": coord.top,
              } as React.CSSProperties
            }
          >
            {Array.from({ length: fly.chipCount }).map((_, i) => (
              <span
                key={i}
                className={
                  fly.direction === "from-pot"
                    ? "premium-chip-fly premium-chip-fly-from-pot"
                    : "premium-chip-fly"
                }
                style={{
                  animationDelay: `${i * 45}ms`,
                  background: `linear-gradient(135deg, ${CHIP_COLORS[i % CHIP_COLORS.length]}, #1a1a22)`,
                  ...(fly.direction === "from-pot"
                    ? ({
                        "--fly-to-x": coord.left,
                        "--fly-to-y": coord.top,
                      } as React.CSSProperties)
                    : {}),
                }}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
