"use client";

import Link from "next/link";
import type { FairnessMode } from "@/lib/fairness/modes";
import { fairnessModeLabel, fairnessModeSummary } from "@/lib/fairness/modes";

export default function FairnessBadge({ mode }: { mode: FairnessMode }) {
  const onChain = mode === "onchain-cash";

  return (
    <div className="premium-center-badge flex flex-col items-center gap-2">
      <div className={`premium-shield${onChain ? "" : " opacity-60"}`}>
        <svg className="h-5 w-5 text-violet-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      </div>
      <p className="max-w-[260px] text-center text-[9px] font-bold uppercase leading-[1.8] tracking-[0.2em] text-zinc-500">
        {fairnessModeLabel(mode)}
        {onChain && (
          <>
            <br />
            <span className="text-violet-400/90">Escrow · auditable txs</span>
          </>
        )}
      </p>
      <p className="max-w-[240px] text-center text-[8px] leading-relaxed text-zinc-600">
        {fairnessModeSummary(mode)}
      </p>
      <Link
        href="/fairness"
        className="text-[8px] font-bold uppercase tracking-[0.18em] text-violet-400/80 hover:text-violet-300"
      >
        How verification works →
      </Link>
    </div>
  );
}
