const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const SUITS = ["♠", "♥", "♦", "♣"];
const SUIT_COLORS = ["text-slate-100", "text-red-400", "text-red-400", "text-slate-100"];

/** Poker shorthand T → readable 10 on the felt. */
function rankDisplay(rank: string): string {
  return rank === "T" ? "10" : rank;
}

export function cardLabel(card: number): string {
  if (card >= 52 || card === 255) return "?";
  const rank = card % 13;
  const suit = Math.floor(card / 13);
  return `${rankDisplay(RANKS[rank])}${SUITS[suit]}`;
}

export function cardRank(card: number): string {
  if (card >= 52 || card === 255) return "?";
  return rankDisplay(RANKS[card % 13]);
}

export function cardSuit(card: number): string {
  if (card >= 52 || card === 255) return "?";
  return SUITS[Math.floor(card / 13)];
}

export function cardIsRed(card: number): boolean {
  const suit = Math.floor(card / 13);
  return suit === 1 || suit === 2;
}

export function cardColorClass(card: number): string {
  if (card >= 52 || card === 255) return "text-slate-400";
  const suit = Math.floor(card / 13);
  return SUIT_COLORS[suit];
}

export function phaseLabel(phase: string): string {
  const labels: Record<string, string> = {
    waiting: "Waiting for players",
    preFlop: "Pre-Flop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown",
  };
  return labels[phase] ?? phase;
}
