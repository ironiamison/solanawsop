"use client";

import type { ReactNode } from "react";

/** Ambient lighting + floor glow wrapping the poker table */
export default function TableScene({ children }: { children: ReactNode }) {
  return (
    <div className="premium-table-scene relative w-full">
      <div className="premium-ambient" aria-hidden>
        <span className="premium-orb premium-orb-violet" />
        <span className="premium-orb premium-orb-blue" />
        <span className="premium-orb premium-orb-magenta" />
      </div>
      <div className="premium-floor-glow" aria-hidden />
      {children}
    </div>
  );
}
