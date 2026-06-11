"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LobbyAssetImage from "@/components/home/LobbyAssetImage";
import { BtnPrimary, BtnGhost, LobbyCard } from "@/components/home/lobby";
import { TOKEN_SYMBOL, WEEKLY_TOURNAMENT } from "@/lib/constants";
import { roomPda } from "@/lib/pdas";
import {
  allTournamentEvents,
  getFeaturedTournament,
  type TournamentEvent,
  type TournamentStatus,
} from "@/lib/tournaments";
import { formatCountdown, nextWeeklyTournamentStart } from "@/lib/tournament";

function StatusPill({ status }: { status: TournamentStatus }) {
  const styles: Record<TournamentStatus, string> = {
    live: "tourney-status tourney-status--live",
    registering: "tourney-status tourney-status--open",
    soon: "tourney-status tourney-status--soon",
  };
  const labels: Record<TournamentStatus, string> = {
    live: "Live",
    registering: "Open",
    soon: "Soon",
  };
  return <span className={styles[status]}>{labels[status]}</span>;
}

function tournamentHref(event: TournamentEvent): string {
  const tier = event.tierIndex ?? WEEKLY_TOURNAMENT.tierIndex;
  const [room] = roomPda(tier);
  return `/table/${room.toBase58()}`;
}

function FeaturedHero({
  event,
  countdown,
}: {
  event: TournamentEvent;
  countdown: string;
}) {
  const href = tournamentHref(event);

  return (
    <section className="tourney-featured">
      <div className="tourney-featured-glow" aria-hidden />
      <div className="tourney-featured-inner">
        <div className="tourney-featured-visual" aria-hidden>
          <LobbyAssetImage
            src="/assets/lobby/trophy-3d.png"
            alt=""
            width={160}
            height={160}
            className="tourney-featured-trophy"
          />
        </div>
        <div className="tourney-featured-copy">
          <p className="tourney-eyebrow">Featured · Season 1</p>
          <h2 className="tourney-featured-title">{event.title}</h2>
          <p className="tourney-featured-sub">{event.subtitle}</p>
          <dl className="tourney-featured-stats">
            <div>
              <dt>Prize pool</dt>
              <dd>{event.prizePool}</dd>
            </div>
            <div>
              <dt>Buy-in</dt>
              <dd>{event.buyInLabel}</dd>
            </div>
            <div>
              <dt>Starts in</dt>
              <dd className="tabular-nums">{countdown || event.startsIn}</dd>
            </div>
            <div>
              <dt>Players</dt>
              <dd>{event.playersLabel}</dd>
            </div>
          </dl>
          <div className="tourney-featured-actions">
            <BtnPrimary href={href}>Register & join table</BtnPrimary>
            <BtnGhost href="/leaderboard">View leaderboard</BtnGhost>
          </div>
        </div>
      </div>
    </section>
  );
}

function TournamentRow({ event }: { event: TournamentEvent }) {
  const href = tournamentHref(event);

  return (
    <Link href={href} className="tourney-row group">
      <div className="tourney-row-main">
        <StatusPill status={event.status} />
        <div className="min-w-0">
          <p className="tourney-row-title">{event.title}</p>
          <p className="tourney-row-meta">
            {event.buyInLabel} · {event.prizePool} · {event.subtitle}
          </p>
        </div>
      </div>
      <div className="tourney-row-side">
        <p className="tourney-row-players">{event.playersLabel}</p>
        <p className="tourney-row-starts tabular-nums">{event.startsIn ?? "—"}</p>
      </div>
    </Link>
  );
}

export default function TournamentsPageContent() {
  const [countdown, setCountdown] = useState("");
  const featured = getFeaturedTournament();
  const upcoming = allTournamentEvents().filter((e) => !e.featured);

  useEffect(() => {
    const tick = () =>
      setCountdown(formatCountdown(nextWeeklyTournamentStart().getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="tourney-page">
      <FeaturedHero event={featured} countdown={countdown} />

      <div className="tourney-grid">
        <LobbyCard className="tourney-list-card p-5" hover={false}>
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="tourney-eyebrow">Schedule</p>
              <h3 className="text-lg font-bold text-white">Upcoming events</h3>
            </div>
            <p className="text-[11px] text-zinc-600">All times UTC</p>
          </div>
          <ul className="tourney-list">
            {upcoming.map((event) => (
              <li key={event.id}>
                <TournamentRow event={event} />
              </li>
            ))}
          </ul>
        </LobbyCard>

        <div className="tourney-aside space-y-4">
          <LobbyCard className="p-5" hover={false}>
            <p className="tourney-eyebrow">How it works</p>
            <h3 className="mt-1 text-base font-bold text-white">Community tournaments</h3>
            <ol className="tourney-steps">
              <li>Register from any open event — takes you to the hosted table.</li>
              <li>Buy in with {TOKEN_SYMBOL} at the listed stake tier.</li>
              <li>Play until one player holds the stack — prizes paid on-chain.</li>
            </ol>
          </LobbyCard>

          <LobbyCard className="p-5" hover={false}>
            <p className="tourney-eyebrow">Weekly flagship</p>
            <p className="mt-1 text-sm font-semibold text-zinc-200">
              {WEEKLY_TOURNAMENT.title}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-500">
              Every Friday {WEEKLY_TOURNAMENT.hourUtc}:00 UTC · featured championship table
              with the biggest guaranteed pool on {TOKEN_SYMBOL}.
            </p>
            <Link
              href={tournamentHref(featured)}
              className="mt-4 inline-flex text-xs font-semibold text-violet-400 hover:text-violet-300"
            >
              Go to featured table →
            </Link>
          </LobbyCard>
        </div>
      </div>
    </div>
  );
}
