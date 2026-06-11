"use client";

import { PublicKey } from "@solana/web3.js";
import { TOKEN_SYMBOL } from "@/lib/constants";
import BrandWordLockup from "@/components/brand/BrandWordLockup";
import { BtnGhost, BtnPrimary } from "./lobby";
import HeroAssets from "./HeroAssets";

export default function HomeHero({ playTarget }: { playTarget?: PublicKey }) {
  const playHref = playTarget ? `/table/${playTarget.toBase58()}` : "/#cash-games";

  return (
    <section className="lobby-hero premium-hero relative overflow-hidden rounded-xl">
      <div className="relative z-10 grid lg:grid-cols-[1fr_300px]">
        <div className="p-6 sm:p-8 lg:py-9">
          <BrandWordLockup size="md" showTagline className="mb-4" />
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-violet-400/90">
            Solana · 6-max NL Hold&apos;em
          </p>
          <h1 className="max-w-lg text-2xl font-extrabold uppercase leading-[1.1] tracking-tight text-white sm:text-[1.65rem]">
            The most interactive poker{" "}
            <span className="bg-gradient-to-r from-violet-300 via-purple-400 to-violet-400 bg-clip-text text-transparent">
              on chain
            </span>
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-500">
            Verifiable · Fair · Non-custodial · Compete · Bluff · Win
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <BtnPrimary href={playHref}>Play now</BtnPrimary>
            <BtnGhost href="/demo">Test us out</BtnGhost>
            <BtnGhost href="#cash-games">View tables</BtnGhost>
          </div>
          <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> Provably fair
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> Runs on Solana
            </li>
            <li className="flex items-center gap-1.5">
              <span className="text-emerald-500">✓</span> {TOKEN_SYMBOL} wagers
            </li>
          </ul>
        </div>

        <HeroAssets />
      </div>
    </section>
  );
}
