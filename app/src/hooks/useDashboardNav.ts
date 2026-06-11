"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { DashboardNavItem } from "@/lib/dashboard-nav";

export function useDashboardNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const [hash, setHash] = useState("");

  useEffect(() => {
    const sync = () => setHash(window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  const isActive = (item: DashboardNavItem) => {
    if (item.href.startsWith("/profile?tab=")) {
      const itemTab = item.href.split("tab=")[1];
      return pathname === "/profile" && tab === itemTab;
    }
    if (item.hash) return pathname === "/" && hash === item.hash;
    if (item.href === "/") return pathname === "/" && !hash;
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const hrefFor = (item: DashboardNavItem) =>
    item.hash ? `${item.href}${item.hash}` : item.href;

  return { pathname, isActive, hrefFor };
}
