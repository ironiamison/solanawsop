"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BUY_IN_TIERS,
  FEATURED_TIER_INDEX,
  PUMP_FUN_URL,
  TOKEN_SYMBOL,
  formatTokens,
} from "@/lib/constants";
import { roomPda } from "@/lib/pdas";

interface FlywheelStats {
  totalBurnedRaw: string;
  handsPlayed: number;
  playersWithHands: number;
}

export default function HeroSection() {
  const [stats, setStats] = useState<FlywheelStats | null>(null);
  const featured = BUY_IN_TIERS[FEATURED_TIER_INDEX];
  const [featuredRoom] = roomPda(FEATURED_TIER_INDEX);

  useEffect(() => {
    fetch("/api/flywheel/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, []);

  return (
    <section className="relative mb-14 pt-4">
      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
        <div>
          <p className="section-label mb-4">Texas Hold&apos;em on Solana</p>
          <h2 className="font-display mb-5 text-[2.5rem] leading-[1.1] tracking-tight text-zinc-50 sm:text-5xl lg:text-[3.25rem]">
            Wager {TOKEN_SYMBOL}.{" "}
            <span className="text-gold-gradient italic">Win the pot.</span>
          </h2>
          <p className="mb-8 max-w-lg text-[15px] leading-relaxed text-zinc-400">
            Real buy-ins in our pump.fun token — not SOL. Cash winners through
            OTC buybacks funded by creator rewards. Every redemption burns
            supply.
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href={PUMP_FUN_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold"
            >
              Get {TOKEN_SYMBOL}
            </a>
            <Link
              href={`/table/${featuredRoom.toBase58()}`}
              className="btn-ghost"
            >
              Play · {featured.label}
            </Link>
          </div>
        </div>

        <div className="surface-card relative overflow-hidden rounded-2xl p-6 sm:p-7">
          <div className="pointer-events-none absolute -right-8 -top-8 text-[7rem] leading-none opacity-[0.04] select-none">
            ♠
          </div>
          <p className="section-label mb-5">Live</p>
          <dl className="grid grid-cols-3 gap-3">
            <Stat label="Hands" value={stats?.handsPlayed} />
            <Stat label="Players" value={stats?.playersWithHands} />
            <Stat
              label="Burned"
              value={
                stats
                  ? formatTokens(BigInt(stats.totalBurnedRaw))
                  : undefined
              }
              highlight
            />
          </dl>
          <div className="section-divider my-5" />
          <p className="text-center text-xs text-zinc-600">
            New here?{" "}
            <Link
              href={`/table/${featuredRoom.toBase58()}`}
              className="text-[#e8c547] hover:underline"
            >
              {featured.label} table
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value?: number | string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center">
      <dt className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
        {label}
      </dt>
      <dd
        className={`mt-1.5 text-xl font-semibold tabular-nums sm:text-2xl ${
          highlight ? "text-[#e8c547]" : "text-zinc-200"
        }`}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}
