"use client";

import Image from "next/image";
import Link from "next/link";
import { BRAND_CHIP_SRC, BRAND_NAME, BRAND_TAGLINE } from "@/lib/constants";

type Variant = "icon" | "compact" | "lockup";

const CHIP_SIZES = {
  sm: { px: 36, className: "h-9 w-9" },
  md: { px: 48, className: "h-12 w-12" },
  lg: { px: 64, className: "h-16 w-16" },
  xl: { px: 88, className: "h-[5.5rem] w-[5.5rem]" },
} as const;

export default function BrandChipMark({
  variant = "compact",
  size = "md",
  href,
  priority = false,
  className = "",
  showTagline = true,
}: {
  variant?: Variant;
  size?: keyof typeof CHIP_SIZES;
  href?: string;
  priority?: boolean;
  className?: string;
  showTagline?: boolean;
}) {
  const chip = CHIP_SIZES[size];

  const chipImg = (
    <Image
      src={BRAND_CHIP_SRC}
      alt=""
      width={chip.px}
      height={chip.px}
      priority={priority}
      unoptimized
      aria-hidden
      className={`brand-chip-img shrink-0 object-contain drop-shadow-[0_8px_24px_rgba(124,58,237,0.35)] ${chip.className}`}
    />
  );

  const content =
    variant === "icon" ? (
      chipImg
    ) : variant === "lockup" ? (
      <div className={`brand-chip-lockup ${className}`}>
        {chipImg}
        <div className="brand-chip-lockup-text">
          <p className="brand-chip-lockup-title">POKER ON SOLANA</p>
          {showTagline && (
            <p className="brand-chip-lockup-tag">{BRAND_TAGLINE.toUpperCase()}</p>
          )}
        </div>
      </div>
    ) : (
      <div className={`brand-chip-compact ${className}`}>
        {chipImg}
        <div className="brand-chip-compact-text">
          <p className="brand-chip-compact-name">{BRAND_NAME}</p>
          {showTagline && <p className="brand-chip-compact-tag">{BRAND_TAGLINE}</p>}
        </div>
      </div>
    );

  if (href) {
    return (
      <Link href={href} className="brand-chip-link inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
