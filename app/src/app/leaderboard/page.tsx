"use client";

import DashboardShell from "@/components/layout/DashboardShell";
import LeaderboardPageHero from "@/components/leaderboard/LeaderboardPageHero";
import LeaderboardPanel from "@/components/leaderboard/LeaderboardPanel";

export default function LeaderboardPage() {
  return (
    <DashboardShell>
      <LeaderboardPageHero />
      <LeaderboardPanel limit={25} page />
    </DashboardShell>
  );
}
