import { clockwisePath } from "@/components/game/seatCoords";

/** Stagger hole-card deal clockwise from the seat left of the dealer; button is last. */
export function holeCardDealDelay(
  seat: number,
  dealerSeat: number,
  cardIndex: number,
  baseMs = 120,
  perCardMs = 85
): number {
  const order =
    seat === dealerSeat ? 5 : Math.max(0, clockwisePath(dealerSeat, seat).length - 1);
  return order * baseMs + cardIndex * perCardMs;
}
