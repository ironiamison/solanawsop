"use client";

import DashboardShell from "@/components/layout/DashboardShell";
import BrandWordLockup from "@/components/brand/BrandWordLockup";
import TournamentsPageContent from "@/components/tournaments/TournamentsPageContent";
import { TOKEN_SYMBOL } from "@/lib/constants";

export default function TournamentsPage() {
  return (
    <DashboardShell>
      <div className="mb-6">
        <BrandWordLockup size="sm" showTagline={false} className="mb-3" />
        <h1 className="text-2xl font-bold text-white">Tournaments</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-500">
          Scheduled {TOKEN_SYMBOL} events — register at the
          table, climb the leaderboard, and chase the weekly championship pool.
        </p>
      </div>
      <TournamentsPageContent />
    </DashboardShell>
  );
}
