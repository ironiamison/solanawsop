"use client";

import DashboardShell from "@/components/layout/DashboardShell";
import BrandChipMark from "@/components/brand/BrandChipMark";
import LeaderboardPanel from "@/components/leaderboard/LeaderboardPanel";

export default function LeaderboardPage() {
  return (
    <DashboardShell>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <BrandChipMark variant="lockup" size="sm" showTagline={false} className="mb-3" />
          <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Global rankings by wins and reward points — find rivals and add friends by @handle.
          </p>
        </div>
      </div>
      <LeaderboardPanel limit={25} />
    </DashboardShell>
  );
}
