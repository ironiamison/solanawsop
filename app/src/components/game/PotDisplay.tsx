"use client";

import { formatTokens } from "@/lib/constants";

export default function PotDisplay({
  amount,
  pulse = false,
  formatAmount = formatTokens,
}: {
  amount: number;
  pulse?: boolean;
  formatAmount?: (n: number) => string;
}) {
  return (
    <div className={`premium-pot flex flex-col items-center gap-1${pulse ? " premium-pot-pulse" : ""}`}>
      <div className="premium-chip-stack" aria-hidden>
        <span className="premium-chip premium-chip-3" />
        <span className="premium-chip premium-chip-2" />
        <span className="premium-chip premium-chip-1" />
      </div>
      <p className="text-[8px] font-bold uppercase tracking-[0.28em] text-zinc-500">
        Pot
      </p>
      <p className="premium-pot-amount tabular-nums">{formatAmount(amount)}</p>
    </div>
  );
}
