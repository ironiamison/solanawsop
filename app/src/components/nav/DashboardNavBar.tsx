"use client";

import { Suspense } from "react";
import DashboardNavLinks from "./DashboardNavLinks";

export default function DashboardNavBar() {
  return (
    <div className="dash-nav-slot hidden lg:flex">
      <Suspense fallback={<div className="dash-nav-skeleton" aria-hidden />}>
        <DashboardNavLinks />
      </Suspense>
    </div>
  );
}
