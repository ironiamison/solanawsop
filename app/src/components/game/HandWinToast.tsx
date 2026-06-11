"use client";

import { formatTokens, TOKEN_SYMBOL } from "@/lib/constants";

interface Props {
  pot: number;
  split?: boolean;
  onDismiss?: () => void;
}

export default function HandWinToast({ pot, split, onDismiss }: Props) {
  return (
    <div
      className="hand-win-toast pointer-events-auto fixed inset-x-0 top-20 z-[80] flex justify-center px-4"
      role="status"
      aria-live="polite"
    >
      <button
        type="button"
        onClick={onDismiss}
        className="hand-win-toast-card flex items-center gap-3 rounded-2xl border border-amber-400/30 bg-gradient-to-r from-amber-500/20 via-violet-600/25 to-emerald-500/20 px-5 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-md"
      >
        <span className="text-2xl" aria-hidden>
          🏆
        </span>
        <div className="text-left">
          <p className="text-sm font-extrabold uppercase tracking-[0.14em] text-amber-200">
            {split ? "You split the pot" : "You won the hand"}
          </p>
          <p className="text-lg font-bold tabular-nums text-white">
            +{formatTokens(pot)} {TOKEN_SYMBOL}
          </p>
        </div>
      </button>
    </div>
  );
}
