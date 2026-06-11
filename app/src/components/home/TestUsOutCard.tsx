"use client";

import Link from "next/link";
import { TOKEN_SYMBOL } from "@/lib/constants";
import LobbyAssetImage from "./LobbyAssetImage";
import { LobbyCard } from "./lobby";

export default function TestUsOutCard() {
  return (
    <LobbyCard
      className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-br from-[#0a100c] via-[#0c0c10] to-[#080c0a] p-5 sm:p-6"
      hover={false}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="relative h-16 w-16 shrink-0">
            <LobbyAssetImage
              src="/assets/lobby/chips-floating-3d.png"
              alt=""
              fill
              className="object-contain drop-shadow-[0_8px_24px_rgba(16,185,129,0.25)]"
              sizes="64px"
            />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-400">
              No wallet needed
            </p>
            <h2 className="mt-1 text-lg font-bold text-white sm:text-xl">Test us out</h2>
            <p className="mt-1.5 max-w-lg text-sm leading-relaxed text-zinc-500">
              Jump into our shared free-play table — pick a username, bet{" "}
              <span className="text-zinc-400">{TOKEN_SYMBOL} play chips</span>, chat and voice with
              others. Full at 6? Spectate until a seat opens.
            </p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
              <li className="text-emerald-500/90">✓ Free chips</li>
              <li className="text-emerald-500/90">✓ Live chat</li>
              <li className="text-emerald-500/90">✓ Voice</li>
              <li className="text-emerald-500/90">✓ 6-max</li>
            </ul>
          </div>
        </div>
        <Link
          href="/demo"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-b from-emerald-500 to-emerald-700 px-8 py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-[0_4px_24px_rgba(16,185,129,0.35)] transition hover:brightness-110 sm:self-center"
        >
          Try free table →
        </Link>
      </div>
    </LobbyCard>
  );
}
