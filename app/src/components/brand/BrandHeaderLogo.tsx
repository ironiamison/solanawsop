"use client";

import BrandWordLockup from "@/components/brand/BrandWordLockup";

/** Horizontal logo for tight headers (mobile top bar, etc.) */
export default function BrandHeaderLogo({
  href = "/",
  priority = false,
  className = "",
}: {
  href?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <BrandWordLockup
      size="sm"
      href={href}
      priority={priority}
      showTagline={false}
      className={className}
    />
  );
}
