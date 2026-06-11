/** Visual seat positions around the table (hero rotated to bottom). */
export const SEAT_COORDS = [
  { left: "50%", top: "100%", transform: "translate(-50%, calc(-100% - 6px))" },
  { left: "11%", top: "81%", transform: "translate(-50%, -50%)" },
  { left: "0%", top: "50%", transform: "translate(-6%, -50%)" },
  { left: "50%", top: "0%", transform: "translate(-50%, 6px)" },
  { left: "100%", top: "50%", transform: "translate(-94%, -50%)" },
  { left: "89%", top: "81%", transform: "translate(-50%, -50%)" },
] as const;

export function visualSeat(actualSeat: number, mySeat: number | null): number {
  if (mySeat === null) return actualSeat;
  return (actualSeat - mySeat + 6) % 6;
}

/** Clockwise seat indices from `from` (exclusive) to `to` (inclusive). */
export function clockwisePath(from: number, to: number): number[] {
  if (from === to) return [to];
  const path: number[] = [];
  let seat = from;
  while (seat !== to) {
    seat = (seat + 1) % 6;
    path.push(seat);
  }
  return path;
}
