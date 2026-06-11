"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BRAND_LOGO_DEMO_SRC,
  BRAND_WORDMARK_SRC,
} from "@/lib/constants";

type Style = "full" | "wordmark";

const SPECS: Record<
  Style,
  { src: string; width: number; height: number; className: string; alt: string }
> = {
  full: {
    src: BRAND_LOGO_DEMO_SRC,
    width: 220,
    height: 44,
    className: "brand-header-logo brand-header-logo--full",
    alt: "POKER ON SOLANA",
  },
  wordmark: {
    src: BRAND_WORDMARK_SRC,
    width: 180,
    height: 20,
    className: "brand-header-logo brand-header-logo--wordmark",
    alt: "SolanaWSOP",
  },
};

/** Horizontal logo for tight headers (mobile top bar, etc.) */
export default function BrandHeaderLogo({
  style = "full",
  href = "/",
  priority = false,
  className = "",
}: {
  style?: Style;
  href?: string;
  priority?: boolean;
  className?: string;
}) {
  const spec = SPECS[style];
  const img = (
    <Image
      src={spec.src}
      alt={spec.alt}
      width={spec.width}
      height={spec.height}
      priority={priority}
      unoptimized
      className={`${spec.className} ${className}`.trim()}
    />
  );

  if (href) {
    return (
      <Link href={href} className="brand-header-logo-link shrink-0">
        {img}
      </Link>
    );
  }

  return img;
}
