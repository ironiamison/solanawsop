"use client";

import Link from "next/link";
import {
  BUY_IN_TIERS,
  FEATURED_TIER_INDEX,
  TOKEN_SYMBOL,
} from "@/lib/constants";
import { roomPda } from "@/lib/pdas";

export default function FeaturedRoomCard() {
  const tier = BUY_IN_TIERS[FEATURED_TIER_INDEX];
  const [roomPk] = roomPda(FEATURED_TIER_INDEX);

  return (
    <Link
      href={`/table/${roomPk.toBase58()}`}
      className="surface-card surface-card-hover group mb-8 block overflow-hidden rounded-2xl"
    >
      <div className="flex flex-wrap items-stretch">
        <div className="flex flex-1 flex-col justify-center p-6 sm:p-7">
          <p className="section-label mb-2">Featured</p>
          <h3 className="font-display text-2xl text-zinc-100 sm:text-3xl">
            Main table
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            {tier.label} buy-in · highest liquidity · all wagers in{" "}
            {TOKEN_SYMBOL}
          </p>
        </div>
        <div className="flex items-center border-t border-white/[0.06] bg-[#e8c547]/[0.04] px-6 py-5 sm:border-l sm:border-t-0 sm:px-8">
          <span className="btn-gold whitespace-nowrap group-hover:brightness-110">
            Sit down
          </span>
        </div>
      </div>
    </Link>
  );
}
