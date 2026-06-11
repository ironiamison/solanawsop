"use client";

import type { ReactNode } from "react";
import DashboardTopBar from "@/components/home/DashboardTopBar";
import DashboardMobileDock from "@/components/nav/DashboardMobileDock";

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="lobby-shell flex min-h-screen flex-col">
      <DashboardTopBar />
      <main className="lobby-main flex-1">
        <div className="lobby-main-inner mx-auto max-w-[1320px] px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
          {children}
        </div>
      </main>
      <DashboardMobileDock />
    </div>
  );
}
