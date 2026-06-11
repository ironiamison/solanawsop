"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LobbyAssetImage from "./LobbyAssetImage";
import { BUY_IN_TIERS, TOKEN_SYMBOL, WEEKLY_TOURNAMENT } from "@/lib/constants";
import { roomPda } from "@/lib/pdas";
import { formatCountdown, nextWeeklyTournamentStart } from "@/lib/tournament";
import { BtnBlockLabel, LobbyCard, SectionTitle, TextLink } from "./lobby";

const UPCOMING = [
  { title: "Deep Stack #87", meta: "250K buy-in · 5K pool", starts: "2h 14m" },
  { title: "Bounty Hunter #56", meta: "100K buy-in · 2.5K pool", starts: "5h 30m" },
];

function FeaturedTrophy() {
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <div
        className="absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15),transparent_70%)]"
        aria-hidden
      />
      <LobbyAssetImage
        src="/assets/lobby/trophy-3d.png"
        alt=""
        fill
        className="object-contain drop-shadow-[0_8px_20px_rgba(245,158,11,0.35)]"
        sizes="72px"
      />
    </div>
  );
}

export default function TournamentsPanel() {
  const [countdown, setCountdown] = useState("");
  const tier = BUY_IN_TIERS[WEEKLY_TOURNAMENT.tierIndex];
  const [room] = roomPda(WEEKLY_TOURNAMENT.tierIndex);
  const href = `/table/${room.toBase58()}`;

  useEffect(() => {
    const tick = () =>
      setCountdown(formatCountdown(nextWeeklyTournamentStart().getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <LobbyCard id="tournaments" className="p-5" hover={false}>
      <SectionTitle action={<TextLink href={href}>View all</TextLink>}>
        Tournaments
      </SectionTitle>

      <Link
        href={href}
        className="group mb-3 block overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#0c0a10] to-[#08080c] p-4 transition hover:border-amber-500/20 hover:shadow-[0_8px_32px_rgba(245,158,11,0.06)]"
      >
        <div className="flex items-start gap-3">
          <FeaturedTrophy />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-500">
              Featured
            </p>
            <p className="mt-0.5 text-[15px] font-bold leading-tight text-white">
              {TOKEN_SYMBOL} Championship
            </p>
            <p className="mt-1.5 text-xs text-zinc-500">
              Prize pool · <span className="font-semibold text-zinc-400">25K {TOKEN_SYMBOL}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-600">
              {tier.label} buy-in · starts {countdown || "—"}
            </p>
          </div>
        </div>
        <BtnBlockLabel className="mt-4 group-hover:brightness-110">Join now</BtnBlockLabel>
      </Link>

      <ul className="space-y-2">
        {UPCOMING.map((t) => (
          <li
            key={t.title}
            className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#08080c] px-3 py-3 transition hover:border-white/[0.08]"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-zinc-300">{t.title}</p>
              <p className="text-[10px] text-zinc-600">{t.meta}</p>
            </div>
            <span className="shrink-0 text-[10px] font-medium tabular-nums text-violet-400">
              {t.starts}
            </span>
          </li>
        ))}
      </ul>
    </LobbyCard>
  );
}
