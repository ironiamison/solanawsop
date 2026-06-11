"use client";

import { usePrivyProfile } from "@/hooks/usePrivyProfile";

/** Keeps DB profile + referral code in sync whenever user is authenticated */
export default function ProfileBootstrap() {
  usePrivyProfile();
  return null;
}
