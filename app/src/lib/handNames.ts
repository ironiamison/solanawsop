import type { HandRank } from "@/lib/demo/handEval";

const CATEGORY_NAMES = [
  "High card",
  "Pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush",
  "Royal flush",
];

export function handRankLabel(rank: HandRank): string {
  return CATEGORY_NAMES[rank.category] ?? "High card";
}
