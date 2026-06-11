"use client";

import Link from "next/link";
import BrandChipMark from "@/components/brand/BrandChipMark";
import { TWITTER_HANDLE, TWITTER_URL } from "@/lib/constants";

export default function DashboardFooter({
  totalHands,
  totalPlayers,
}: {
  totalHands: number;
  totalPlayers: number;
}) {
  return (
    <footer className="dashboard-footer mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.06] pt-6 text-[11px] text-zinc-600">
      <div className="flex flex-wrap items-center gap-4">
        <BrandChipMark variant="icon" size="sm" className="opacity-40" />
        <span className="flex items-center gap-1.5 text-emerald-500/80">
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/10 text-[9px]">✓</span>
          On-chain program
        </span>
        {totalHands > 0 && <span>{totalHands.toLocaleString()} hands</span>}
        {totalPlayers > 0 && <span>{totalPlayers.toLocaleString()} players</span>}
      </div>
      <div className="flex items-center gap-4">
        <a href="#faq" className="transition hover:text-zinc-400">Docs</a>
        <Link href="/fairness" className="transition hover:text-zinc-400">Fairness</Link>
        <a
          href={TWITTER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition hover:text-zinc-400"
        >
          @{TWITTER_HANDLE}
        </a>
        <Link href="/terms" className="transition hover:text-zinc-400">Terms</Link>
        <Link href="/privacy" className="transition hover:text-zinc-400">Privacy</Link>
      </div>
    </footer>
  );
}
