"use client";

import { Suspense, type ReactNode } from "react";
import DashboardSidebar from "@/components/home/DashboardSidebar";
import DashboardTopBar from "@/components/home/DashboardTopBar";

export default function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="lobby-shell flex min-h-screen">
      <Suspense fallback={<aside className="hidden w-[228px] shrink-0 lg:block" />}>
        <DashboardSidebar />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <DashboardTopBar />
        <main className="lobby-main flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1320px] px-4 py-5 sm:px-5 lg:px-6 lg:py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
