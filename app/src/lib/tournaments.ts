import { BUY_IN_TIERS, TOKEN_SYMBOL, WEEKLY_TOURNAMENT } from "@/lib/constants";
import { formatCountdown, nextWeeklyTournamentStart } from "@/lib/tournament";

export type TournamentStatus = "live" | "registering" | "soon";
export type FeaturedBadge = "hot" | "live" | "upcoming";

export type TournamentEvent = {
  id: string;
  title: string;
  subtitle: string;
  buyInLabel: string;
  prizePool: string;
  prizeHighlight?: string;
  playersLabel: string;
  status: TournamentStatus;
  startsIn?: string;
  featured?: boolean;
  featuredBadge?: FeaturedBadge;
  tierIndex?: number;
  gameType?: string;
};

export const FEATURED_TOURNAMENT_ID = "grand-opening-1";

export const PRIZE_STRUCTURE = [
  { place: "1st", payout: "$500", medal: "gold" as const },
  { place: "2nd", payout: "$250", medal: "silver" as const },
  { place: "3rd", payout: "$125", medal: "bronze" as const },
  { place: "4th", payout: "$50" },
  { place: "5th", payout: "$25" },
  { place: "6th", payout: "$25" },
  { place: "7th", payout: "$25" },
  { place: "8th", payout: "$25" },
];

export const GRAND_OPENING_INFO = {
  gameType: "No Limit Hold'em",
  buyIn: "FREE",
  startingChips: "10,000",
  blindLevels: "10 min",
  lateRegistration: "1 Day",
  reEntry: "Unlimited",
  maxPlayers: "256",
  prize: "$1,000 Cash",
};

export function formatCountdownHero(ms: number): string {
  if (ms <= 0) return "LIVE NOW";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  if (days > 0) return `${days} DAY ${String(hours).padStart(2, "0")}H`;
  if (hours > 0) return `${hours}H ${String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0")}M`;
  return `${Math.floor(totalSec / 60)}M`;
}

export function getGrandOpeningTournament(): TournamentEvent {
  const ms = nextWeeklyTournamentStart().getTime() - Date.now();
  const regMs = Math.max(ms, 86_400_000);
  return {
    id: FEATURED_TOURNAMENT_ID,
    title: "Grand Opening Bracket #1",
    subtitle: "Be the first champion on SolanaWSOP. Compete, dominate, and win.",
    buyInLabel: "FREE",
    prizePool: "$1,000 Cash",
    prizeHighlight: "$1,000 CASH PRIZE",
    playersLabel: "—",
    status: "registering",
    startsIn: formatCountdownHero(regMs),
    featured: true,
    featuredBadge: "hot",
    tierIndex: BUY_IN_TIERS[0]?.index ?? 0,
    gameType: "NL Hold'em · bracket",
  };
}

export function getWeeklyChampionship(): TournamentEvent {
  const tier = BUY_IN_TIERS[WEEKLY_TOURNAMENT.tierIndex];
  const ms = nextWeeklyTournamentStart().getTime() - Date.now();
  return {
    id: "weekly-championship",
    title: "Friday Night Hold'em",
    subtitle: WEEKLY_TOURNAMENT.title,
    buyInLabel: tier.label,
    prizePool: `25K ${TOKEN_SYMBOL}`,
    playersLabel: "—",
    status: ms <= 0 ? "live" : "registering",
    startsIn: formatCountdown(ms),
    featuredBadge: "live",
    tierIndex: WEEKLY_TOURNAMENT.tierIndex,
    gameType: "NL Hold'em · 6-max",
  };
}

export function getFeaturedTournament(): TournamentEvent {
  return getGrandOpeningTournament();
}

export const UPCOMING_TOURNAMENTS: TournamentEvent[] = [
  {
    id: "deep-stack-87",
    title: "Deep Stack #87",
    subtitle: "NL Hold'em · deep",
    buyInLabel: BUY_IN_TIERS[2]?.label ?? "250K",
    prizePool: `5K ${TOKEN_SYMBOL}`,
    playersLabel: "—",
    status: "registering",
    startsIn: "5h 30m",
    featuredBadge: "upcoming",
    tierIndex: 2,
    gameType: "NL Hold'em · deep",
  },
  {
    id: "bounty-56",
    title: "Bounty Hunter #56",
    subtitle: "PKO · progressive",
    buyInLabel: BUY_IN_TIERS[1]?.label ?? "100K",
    prizePool: `2.5K ${TOKEN_SYMBOL}`,
    playersLabel: "—",
    status: "registering",
    startsIn: "2h 14m",
    tierIndex: 1,
    gameType: "PKO",
  },
  {
    id: "turbo-22",
    title: "Turbo Sprint #22",
    subtitle: "Fast blinds",
    buyInLabel: "FREE",
    prizePool: `1.2K ${TOKEN_SYMBOL}`,
    playersLabel: "—",
    status: "registering",
    startsIn: "2h 14m",
    tierIndex: 0,
    gameType: "Turbo",
  },
  {
    id: "high-roller-9",
    title: "High Roller #9",
    subtitle: "Final table streamed",
    buyInLabel: BUY_IN_TIERS[3]?.label ?? "500K",
    prizePool: `12K ${TOKEN_SYMBOL}`,
    playersLabel: "—",
    status: "soon",
    startsIn: "Tomorrow",
    tierIndex: 3,
    gameType: "NL Hold'em",
  },
  {
    id: "satellite-12",
    title: "Satellite #12",
    subtitle: "Win your seat",
    buyInLabel: BUY_IN_TIERS[0]?.label ?? "50K",
    prizePool: `Seat · ${TOKEN_SYMBOL} Championship`,
    playersLabel: "—",
    status: "soon",
    startsIn: "Tomorrow",
    tierIndex: 0,
    gameType: "Satellite",
  },
];

export function featuredEventCards(): TournamentEvent[] {
  return [
    getGrandOpeningTournament(),
    getWeeklyChampionship(),
    UPCOMING_TOURNAMENTS[0]!,
  ];
}

export function allTournamentEvents(): TournamentEvent[] {
  return [getWeeklyChampionship(), ...UPCOMING_TOURNAMENTS];
}

export function formatCompactStat(n: number, suffix = ""): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M${suffix}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K${suffix}`;
  return `${n.toLocaleString()}${suffix}`;
}
