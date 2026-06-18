"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import LobbyAssetImage from "@/components/home/LobbyAssetImage";
import { BtnGhost, LobbyCard } from "@/components/home/lobby";
import { formatTokens, TOKEN_SYMBOL, WEEKLY_TOURNAMENT } from "@/lib/constants";
import {
  allTournamentEvents,
  featuredEventCards,
  formatCountdownHero,
  getFeaturedTournament,
  getGrandOpeningTournament,
  getWeeklyChampionship,
  GRAND_OPENING_INFO,
  PRIZE_STRUCTURE,
  FEATURED_TOURNAMENT_ID,
  type TournamentEvent,
  type TournamentStatus,
} from "@/lib/tournaments";
import { nextWeeklyTournamentStart } from "@/lib/tournament";
import TournamentRegisterButton from "@/components/tournaments/TournamentRegisterButton";

function StatusPill({ status }: { status: TournamentStatus }) {
  const map: Record<TournamentStatus, { cls: string; label: string }> = {
    live: { cls: "tourney-status tourney-status--live", label: "Live" },
    registering: { cls: "tourney-status tourney-status--open", label: "Open" },
    soon: { cls: "tourney-status tourney-status--soon", label: "Soon" },
  };
  const { cls, label } = map[status];
  return <span className={cls}>{label}</span>;
}

function ComingSoonCta({ className = "" }: { className?: string }) {
  return (
    <span className={`tourney-coming-soon ${className}`.trim()} aria-disabled>
      Coming soon
    </span>
  );
}

function FeaturedBadge({ badge }: { badge?: string }) {
  if (!badge) return null;
  const labels: Record<string, string> = {
    hot: "Hot",
    live: "Live",
    upcoming: "Upcoming",
  };
  return (
    <span className={`tourney-card-badge tourney-card-badge--${badge}`}>
      {labels[badge] ?? badge}
    </span>
  );
}

function HeroSection({
  event,
  regCountdown,
}: {
  event: TournamentEvent;
  regCountdown: string;
}) {
  return (
    <section className="tourney-hero">
      <div className="tourney-hero-bg" aria-hidden />
      <div className="tourney-hero-inner">
        <div className="tourney-hero-copy">
          <p className="tourney-hero-eyebrow">
            <span aria-hidden>◆</span> Featured tournament
          </p>
          <h1 className="tourney-hero-title">{event.title}</h1>
          <p className="tourney-hero-prize">{event.prizeHighlight ?? event.prizePool}</p>
          <p className="tourney-hero-sub">{event.subtitle}</p>
          <dl className="tourney-hero-stats">
            <div>
              <dt>Registration ends in</dt>
              <dd className="tabular-nums">{regCountdown}</dd>
            </div>
            <div>
              <dt>Buy-in</dt>
              <dd>{event.buyInLabel}</dd>
            </div>
          </dl>
          <div className="tourney-hero-actions">
            <TournamentRegisterButton
              tournamentId={FEATURED_TOURNAMENT_ID}
              className="tourney-btn-register"
              label="Register free"
            />
            <BtnGhost href="#prize-structure" className="tourney-btn-outline">
              Prize structure
            </BtnGhost>
          </div>
        </div>
        <div className="tourney-hero-visual" aria-hidden>
          <LobbyAssetImage
            src="/assets/lobby/trophy-3d.png"
            alt=""
            width={220}
            height={220}
            className="tourney-hero-trophy"
          />
        </div>
      </div>
    </section>
  );
}

const FEATURED_CARD_BG: Partial<Record<string, string>> = {
  hot: "/assets/lobby/tournament-hero-bg.png",
  live: "/assets/lobby/tournament-live-bg.png",
  upcoming: "/assets/lobby/tournament-upcoming-bg.png",
};

function FeaturedCard({ event }: { event: TournamentEvent }) {
  const badge = event.featuredBadge;
  const bgSrc = badge ? FEATURED_CARD_BG[badge] : undefined;
  const cardMod = badge && FEATURED_CARD_BG[badge] ? ` tourney-featured-card--${badge}` : "";

  return (
    <article className={`tourney-featured-card${cardMod}`}>
      {bgSrc && (
        <>
          <LobbyAssetImage
            src={bgSrc}
            alt=""
            fill
            className="tourney-featured-card-bg"
            sizes="(max-width: 1024px) 100vw, 33vw"
          />
          <div className="tourney-featured-card-vignette" aria-hidden />
        </>
      )}
      <div className="tourney-featured-card-content">
        <FeaturedBadge badge={event.featuredBadge} />
        <h3 className="tourney-featured-card-title">{event.title}</h3>
        <p className="tourney-featured-card-prize">{event.prizePool}</p>
        <p className="tourney-featured-card-meta">
          {event.status === "live" ? "Live now" : `Starts in ${event.startsIn ?? "—"}`}
        </p>
        <ComingSoonCta className="tourney-featured-card-btn" />
      </div>
    </article>
  );
}

function EventTableRow({ event }: { event: TournamentEvent }) {
  return (
    <tr className="tourney-table-row">
      <td>
        <StatusPill status={event.status} />
      </td>
      <td>
        <div className="tourney-table-event">
          <span className="tourney-table-icon" aria-hidden>
            {event.gameType?.includes("PKO") ? "🎯" : "♠"}
          </span>
          <div className="min-w-0">
            <p className="tourney-table-title">{event.title}</p>
            <p className="tourney-table-sub">
              {event.prizePool} · {event.subtitle}
            </p>
          </div>
        </div>
      </td>
      <td className="tourney-table-num">{event.playersLabel}</td>
      <td className="tourney-table-num">{event.buyInLabel}</td>
      <td className="tourney-table-time tabular-nums">{event.startsIn ?? "—"}</td>
      <td className="tourney-table-action">
        <ComingSoonCta className="tourney-table-btn" />
      </td>
    </tr>
  );
}

function HowItWorks() {
  const steps = [
    { n: "1", title: "Register free", sub: "Sign in and reserve your bracket seat" },
    { n: "2", title: "Join table", sub: "Buy in at the listed stake tier" },
    { n: "3", title: "Win tournament", sub: "Outlast the field — last stack wins" },
    { n: "4", title: "Get paid instantly", sub: "Prizes settled on-chain" },
  ];

  return (
    <LobbyCard className="tourney-aside-card p-5" hover={false}>
      <h3 className="tourney-aside-heading">How it works</h3>
      <ol className="tourney-how-steps">
        {steps.map((s) => (
          <li key={s.n} className="tourney-how-step">
            <span className="tourney-how-num">{s.n}</span>
            <div>
              <p className="tourney-how-title">{s.title}</p>
              <p className="tourney-how-sub">{s.sub}</p>
            </div>
          </li>
        ))}
      </ol>
    </LobbyCard>
  );
}

function PlatformStats({
  players,
  otcPaidRaw,
}: {
  players: number;
  otcPaidRaw: string;
}) {
  const prizePaid = BigInt(otcPaidRaw || "0");
  const stats = [
    {
      label: "Total prize pool paid",
      value: `${formatTokens(prizePaid)} ${TOKEN_SYMBOL}`,
      icon: "🏆",
    },
    { label: "Total tournaments", value: "0", icon: "🎰" },
    { label: "Total players", value: players.toLocaleString(), icon: "👥" },
  ];

  return (
    <footer className="tourney-stats-bar">
      {stats.map((s) => (
        <div key={s.label} className="tourney-stat">
          <span className="tourney-stat-icon" aria-hidden>
            {s.icon}
          </span>
          <div>
            <p className="tourney-stat-label">{s.label}</p>
            <p className="tourney-stat-value">{s.value}</p>
          </div>
        </div>
      ))}
    </footer>
  );
}

export default function TournamentsPageContent() {
  const [regCountdown, setRegCountdown] = useState("");
  const [platformStats, setPlatformStats] = useState({ players: 0, otcPaidRaw: "0" });

  const featured = getFeaturedTournament();
  const cards = featuredEventCards();
  const upcoming = allTournamentEvents();
  const weekly = getWeeklyChampionship();
  const grandOpening = getGrandOpeningTournament();

  useEffect(() => {
    const tick = () => {
      const ms = nextWeeklyTournamentStart().getTime() - Date.now();
      setRegCountdown(formatCountdownHero(Math.max(ms, 86_400_000)));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    fetch("/api/flywheel/stats")
      .then((r) => r.json())
      .then((d) => {
        setPlatformStats({
          players: d.playersWithHands ?? 0,
          otcPaidRaw: d.totalOtcPaidRaw ?? "0",
        });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="tourney-page" data-tour="tournaments-page">
      <HeroSection event={featured} regCountdown={regCountdown} />

      <section className="tourney-featured-section">
        <div className="tourney-section-head">
          <h2 className="tourney-section-title">Featured events</h2>
          <Link href="#upcoming-events" className="tourney-section-link">
            View all
          </Link>
        </div>
        <div className="tourney-featured-grid">
          {cards.map((event) => (
            <FeaturedCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      <div className="tourney-layout">
        <div className="tourney-main">
          <LobbyCard id="upcoming-events" className="tourney-table-card p-0" hover={false}>
            <div className="tourney-table-head">
              <h2 className="tourney-section-title">Upcoming events</h2>
              <p className="tourney-table-utc">All times UTC</p>
            </div>
            <div className="tourney-table-wrap">
              <table className="tourney-table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Event</th>
                    <th>Players</th>
                    <th>Buy-in</th>
                    <th>Starts</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((event) => (
                    <EventTableRow key={event.id} event={event} />
                  ))}
                </tbody>
              </table>
            </div>
          </LobbyCard>

          <div className="tourney-detail-grid" id="prize-structure">
            <LobbyCard className="p-5" hover={false}>
              <h3 className="tourney-detail-heading">Prize structure</h3>
              <table className="tourney-prize-table">
                <tbody>
                  {PRIZE_STRUCTURE.map((row) => (
                    <tr key={row.place}>
                      <td className="tourney-prize-place">
                        {row.medal === "gold" && <span className="tourney-medal">🥇</span>}
                        {row.medal === "silver" && <span className="tourney-medal">🥈</span>}
                        {row.medal === "bronze" && <span className="tourney-medal">🥉</span>}
                        {row.place}
                      </td>
                      <td className="tourney-prize-amount">{row.payout}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </LobbyCard>

            <LobbyCard className="p-5" hover={false}>
              <h3 className="tourney-detail-heading">Tournament info</h3>
              <dl className="tourney-info-list">
                {Object.entries({
                  "Game type": GRAND_OPENING_INFO.gameType,
                  "Buy-in": GRAND_OPENING_INFO.buyIn,
                  "Starting chips": GRAND_OPENING_INFO.startingChips,
                  "Blind levels": GRAND_OPENING_INFO.blindLevels,
                  "Late registration": GRAND_OPENING_INFO.lateRegistration,
                  "Re-entry": GRAND_OPENING_INFO.reEntry,
                  "Max players": GRAND_OPENING_INFO.maxPlayers,
                  Prize: GRAND_OPENING_INFO.prize,
                }).map(([k, v]) => (
                  <div key={k} className="tourney-info-row">
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </LobbyCard>
          </div>
        </div>

        <aside className="tourney-aside">
          <HowItWorks />

          <LobbyCard className="tourney-aside-card p-5" hover={false}>
            <p className="tourney-eyebrow">Weekly flagship</p>
            <h3 className="tourney-aside-heading">{weekly.title}</h3>
            <p className="tourney-aside-copy">
              Every Friday {WEEKLY_TOURNAMENT.hourUtc}:00 UTC · {weekly.prizePool} guaranteed on{" "}
              {TOKEN_SYMBOL}.
            </p>
            <span className="tourney-aside-link tourney-aside-link--muted">Coming soon</span>
          </LobbyCard>

          <LobbyCard className="tourney-aside-card tourney-champions-card p-5" hover={false}>
            <h3 className="tourney-aside-heading">Past champions</h3>
            <p className="tourney-champions-cta">Become the first champion</p>
            <p className="tourney-aside-copy">
              {grandOpening.title} — crown the first name on the SolanaWSOP hall of fame.
            </p>
          </LobbyCard>

          <LobbyCard className="tourney-aside-card tourney-pool-card p-5" hover={false}>
            <p className="tourney-pool-amount">$1,000</p>
            <p className="tourney-pool-label">100% of prize pool paid to players</p>
            <LobbyAssetImage
              src="/assets/lobby/chip-stack-3d.png"
              alt=""
              width={120}
              height={80}
              className="tourney-pool-img"
            />
          </LobbyCard>
        </aside>
      </div>

      <PlatformStats players={platformStats.players} otcPaidRaw={platformStats.otcPaidRaw} />
    </div>
  );
}
