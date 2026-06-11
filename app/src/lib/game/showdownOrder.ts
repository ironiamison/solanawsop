import type { PlayerState } from "@/lib/types";

/** Clockwise reveal order from the seat left of the dealer. */
export function showdownRevealOrder(
  seat: number,
  dealerSeat: number,
  players: PlayerState[]
): number {
  const activeSeats = new Set(
    players.filter((p) => p.status !== "folded").map((p) => p.seat)
  );
  const order: number[] = [];
  let s = dealerSeat;
  for (let i = 0; i < 6; i++) {
    s = (s + 1) % 6;
    if (activeSeats.has(s)) order.push(s);
  }
  const idx = order.indexOf(seat);
  return idx >= 0 ? idx : 0;
}
