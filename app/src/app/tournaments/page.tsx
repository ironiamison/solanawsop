"use client";

import DashboardShell from "@/components/layout/DashboardShell";
import TournamentsPageContent from "@/components/tournaments/TournamentsPageContent";

export default function TournamentsPage() {
  return (
    <DashboardShell>
      <TournamentsPageContent />
    </DashboardShell>
  );
}
