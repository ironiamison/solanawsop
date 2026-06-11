import { BUY_IN_TIERS, TOKEN_SYMBOL, WEEKLY_TOURNAMENT } from "@/lib/constants";
import { formatCountdown, nextWeeklyTournamentStart } from "@/lib/tournament";

export type TournamentStatus = "live" | "registering" | "soon";

export type TournamentEvent = {
  id: string;
  title: string;
  subtitle: string;
  buyInLabel: string;
  prizePool: string;
  playersLabel: string;
  status: TournamentStatus;
  startsIn?: string;
  featured?: boolean;
  tierIndex?: number;
};

export const FEATURED_TOURNAMENT_ID = "weekly-championship";

export function getFeaturedTournament(): TournamentEvent {
  const tier = BUY_IN_TIERS[WEEKLY_TOURNAMENT.tierIndex];
  const ms = nextWeeklyTournamentStart().getTime() - Date.now();
  return {
    id: FEATURED_TOURNAMENT_ID,
    title: `${TOKEN_SYMBOL} Championship`,
    subtitle: WEEKLY_TOURNAMENT.title,
    buyInLabel: tier.label,
    prizePool: `25K ${TOKEN_SYMBOL}`,
    playersLabel: "0 / 128",
    status: ms <= 0 ? "live" : "registering",
    startsIn: formatCountdown(ms),
    featured: true,
    tierIndex: WEEKLY_TOURNAMENT.tierIndex,
  };
}

export const UPCOMING_TOURNAMENTS: TournamentEvent[] = [
  {
    id: "deep-stack-87",
    title: "Deep Stack #87",
    subtitle: "NL Hold'em · 6-max",
    buyInLabel: BUY_IN_TIERS[2]?.label ?? "250K",
    prizePool: "5K pool",
    playersLabel: "12 / 64",
    status: "registering",
    startsIn: "2h 14m",
    tierIndex: 2,
  },
  {
    id: "bounty-56",
    title: "Bounty Hunter #56",
    subtitle: "PKO · progressive",
    buyInLabel: BUY_IN_TIERS[1]?.label ?? "100K",
    prizePool: "2.5K pool",
    playersLabel: "8 / 48",
    status: "registering",
    startsIn: "5h 30m",
    tierIndex: 1,
  },
  {
    id: "turbo-22",
    title: "Turbo Sprint #22",
    subtitle: "Fast blinds · 30 min levels",
    buyInLabel: BUY_IN_TIERS[0]?.label ?? "50K",
    prizePool: "1.2K pool",
    playersLabel: "—",
    status: "soon",
    startsIn: "Tomorrow",
    tierIndex: 0,
  },
  {
    id: "high-roller-9",
    title: "High Roller #9",
    subtitle: "Final table streamed",
    buyInLabel: BUY_IN_TIERS[3]?.label ?? "500K",
    prizePool: "12K pool",
    playersLabel: "—",
    status: "soon",
    startsIn: "Sat 20:00 UTC",
    tierIndex: 3,
  },
];

export function allTournamentEvents(): TournamentEvent[] {
  return [getFeaturedTournament(), ...UPCOMING_TOURNAMENTS];
}
