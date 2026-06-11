"use client";

import { useEffect } from "react";
import { REFERRAL_STORAGE_KEY } from "@/lib/rewards";

/** Persist ?ref=CODE from URL for profile sync on first login */
export default function ReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) {
      localStorage.setItem(REFERRAL_STORAGE_KEY, ref.trim().toUpperCase());
      params.delete("ref");
      const next = params.toString();
      const url = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", url);
    }
  }, []);

  return null;
}
