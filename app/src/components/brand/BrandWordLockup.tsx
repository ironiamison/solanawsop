"use client";

import Image from "next/image";
import Link from "next/link";
import { BRAND_CHIP_SRC } from "@/lib/constants";

const SIZES = {
  sm: { chip: 32, chipClass: "h-8 w-8", variant: "sm" as const },
  md: { chip: 40, chipClass: "h-10 w-10", variant: "md" as const },
  lg: { chip: 56, chipClass: "h-14 w-14", variant: "lg" as const },
};

/** Chip + SOLANAWSOP gradient wordmark + tagline — crisp, no raster logo */
export default function BrandWordLockup({
  size = "md",
  href,
  priority = false,
  showTagline = true,
  className = "",
}: {
  size?: keyof typeof SIZES;
  href?: string;
  priority?: boolean;
  showTagline?: boolean;
  className?: string;
}) {
  const spec = SIZES[size];

  const content = (
    <div className={`brand-word-lockup brand-word-lockup--${spec.variant} ${className}`.trim()}>
      <Image
        src={BRAND_CHIP_SRC}
        alt=""
        width={spec.chip}
        height={spec.chip}
        priority={priority}
        unoptimized
        aria-hidden
        className={`brand-word-lockup-chip shrink-0 object-contain ${spec.chipClass}`}
      />
      <div className="brand-word-lockup-text min-w-0">
        <p className="brand-word-lockup-name" aria-label="SolanaWSOP">
          <span className="brand-word-lockup-solana">SOLANA</span>
          <span className="brand-word-lockup-wsop">WSOP</span>
        </p>
        {showTagline && (
          <div className="brand-word-lockup-tagline" aria-hidden>
            <span className="brand-word-lockup-line" />
            <span>POKER ON SOLANA</span>
            <span className="brand-word-lockup-line" />
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="brand-word-lockup-link">
        {content}
      </Link>
    );
  }

  return content;
}
