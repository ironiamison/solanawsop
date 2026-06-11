"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LobbyAssetImage from "./LobbyAssetImage";
import { getFeaturedTournament, UPCOMING_TOURNAMENTS } from "@/lib/tournaments";
import { formatCountdown, nextWeeklyTournamentStart } from "@/lib/tournament";
import { BtnBlockLabel, LobbyCard, SectionTitle, TextLink } from "./lobby";

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
  const featured = getFeaturedTournament();

  useEffect(() => {
    const tick = () =>
      setCountdown(formatCountdown(nextWeeklyTournamentStart().getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <LobbyCard id="tournaments" className="p-5" hover={false}>
      <SectionTitle action={<TextLink href="/tournaments">View all</TextLink>}>
        Tournaments
      </SectionTitle>

      <div className="group mb-3 overflow-hidden rounded-xl border border-white/[0.08] bg-gradient-to-br from-[#0c0a10] to-[#08080c] p-4">
        <div className="flex items-start gap-3">
          <FeaturedTrophy />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-500">
              Featured
            </p>
            <p className="mt-0.5 text-[15px] font-bold leading-tight text-white">
              {featured.title}
            </p>
            <p className="mt-1.5 text-xs text-zinc-500">
              Prize pool · <span className="font-semibold text-zinc-400">{featured.prizePool}</span>
            </p>
            <p className="mt-0.5 text-[11px] text-zinc-600">
              {featured.buyInLabel} buy-in · starts {countdown || featured.startsIn || "—"}
            </p>
          </div>
        </div>
        <BtnBlockLabel className="mt-4 opacity-60">Coming soon</BtnBlockLabel>
      </div>

      <ul className="space-y-2">
        {UPCOMING_TOURNAMENTS.slice(0, 2).map((t) => (
          <li key={t.id}>
            <Link
              href="/tournaments"
              className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-[#08080c] px-3 py-3 transition hover:border-white/[0.08]"
            >
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-zinc-300">{t.title}</p>
                <p className="text-[10px] text-zinc-600">
                  {t.buyInLabel} · {t.prizePool}
                </p>
              </div>
              <span className="shrink-0 text-[10px] font-medium tabular-nums text-violet-400">
                {t.startsIn}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </LobbyCard>
  );
}
