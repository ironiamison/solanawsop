"use client";

import BrandWordLockup from "@/components/brand/BrandWordLockup";
import BrandChipMark from "@/components/brand/BrandChipMark";

type Size = "xs" | "sm" | "md" | "lg" | "sidebar" | "demo" | "hero" | "icon";

const LOCKUP_SIZE: Record<string, "sm" | "md" | "lg"> = {
  xs: "sm",
  sm: "sm",
  md: "md",
  lg: "lg",
  sidebar: "md",
  demo: "lg",
  hero: "lg",
};

/** @deprecated Prefer BrandWordLockup or BrandChipMark */
export default function BrandLogo({
  size = "md",
  href,
  priority = false,
  className = "",
  iconOnly = false,
}: {
  size?: Size;
  href?: string;
  priority?: boolean;
  className?: string;
  iconOnly?: boolean;
  variant?: string;
}) {
  if (iconOnly || size === "icon") {
    return (
      <BrandChipMark
        variant="icon"
        size={size === "icon" ? "md" : "sm"}
        href={href}
        priority={priority}
        className={className}
      />
    );
  }

  return (
    <BrandWordLockup
      size={LOCKUP_SIZE[size] ?? "md"}
      href={href}
      priority={priority}
      showTagline={size === "demo" || size === "hero" || size === "lg"}
      className={className}
    />
  );
}
