"use client";

import BrandChipMark from "@/components/brand/BrandChipMark";

type Size = "xs" | "sm" | "md" | "lg" | "sidebar" | "demo" | "hero" | "icon";
type Variant = "compact" | "sidebar" | "hero" | "demo";

const CHIP_SIZE: Record<Size, "sm" | "md" | "lg" | "xl"> = {
  xs: "sm",
  sm: "sm",
  md: "md",
  lg: "lg",
  sidebar: "sm",
  demo: "xl",
  hero: "xl",
  icon: "md",
};

/** @deprecated Prefer BrandChipMark — kept for legacy imports */
export default function BrandLogo({
  size = "md",
  href,
  priority = false,
  className = "",
  iconOnly = false,
  variant,
}: {
  size?: Size;
  href?: string;
  priority?: boolean;
  className?: string;
  iconOnly?: boolean;
  variant?: Variant;
}) {
  const resolvedVariant: Variant =
    variant ??
    (size === "demo"
      ? "demo"
      : size === "sidebar"
        ? "sidebar"
        : size === "hero"
          ? "hero"
          : "compact");

  if (iconOnly || size === "icon") {
    return (
      <BrandChipMark
        variant="icon"
        size={CHIP_SIZE[size]}
        href={href}
        priority={priority}
        className={className}
      />
    );
  }

  const showTagline = resolvedVariant === "demo" || resolvedVariant === "hero";

  return (
    <BrandChipMark
      variant="lockup"
      size={CHIP_SIZE[size]}
      href={href}
      priority={priority}
      showTagline={showTagline}
      className={className}
    />
  );
}
