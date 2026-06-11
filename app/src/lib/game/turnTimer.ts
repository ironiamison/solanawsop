/** Seconds allowed per betting decision before time bank is consumed */
export const ACTION_TIMER_SECONDS = 10;
export const ACTION_TIMER_MS = ACTION_TIMER_SECONDS * 1000;

/** Extra seconds per player for the whole table session (tournament-style bank) */
export const TIME_BANK_SECONDS = 30;
export const TIME_BANK_MS = TIME_BANK_SECONDS * 1000;

export type TurnTimerPhase = "action" | "bank";

export function turnElapsed(turnStartedAt: number | undefined, now = Date.now()): number {
  if (!turnStartedAt) return 0;
  return Math.max(0, now - turnStartedAt);
}

export function turnTimerPhase(
  turnStartedAt: number | undefined,
  timeBankMs: number,
  now = Date.now()
): TurnTimerPhase {
  if (!turnStartedAt) return "action";
  return turnElapsed(turnStartedAt, now) >= ACTION_TIMER_MS && timeBankMs > 0
    ? "bank"
    : "action";
}

export function turnProgress(
  turnStartedAt: number | undefined,
  timeBankMs = 0,
  now = Date.now()
): number {
  if (!turnStartedAt) return 1;
  const elapsed = turnElapsed(turnStartedAt, now);
  if (elapsed < ACTION_TIMER_MS) {
    return Math.max(0, 1 - elapsed / ACTION_TIMER_MS);
  }
  if (timeBankMs <= 0) return 0;
  const bankElapsed = elapsed - ACTION_TIMER_MS;
  return Math.max(0, 1 - bankElapsed / timeBankMs);
}

export function secondsRemaining(
  turnStartedAt: number | undefined,
  timeBankMs = 0,
  now = Date.now()
): number {
  if (!turnStartedAt) return ACTION_TIMER_SECONDS;
  const elapsed = turnElapsed(turnStartedAt, now);
  if (elapsed < ACTION_TIMER_MS) {
    return Math.max(0, Math.ceil((ACTION_TIMER_MS - elapsed) / 1000));
  }
  const bankRemaining = timeBankMs - (elapsed - ACTION_TIMER_MS);
  return Math.max(0, Math.ceil(bankRemaining / 1000));
}

export function isTurnExpired(
  turnStartedAt: number | undefined,
  timeBankMs = 0,
  now = Date.now()
): boolean {
  if (!turnStartedAt) return false;
  return turnElapsed(turnStartedAt, now) >= ACTION_TIMER_MS + timeBankMs;
}

export function consumeTimeBank(
  turnStartedAt: number | undefined,
  timeBankMs: number,
  now = Date.now()
): number {
  if (!turnStartedAt || timeBankMs <= 0) return timeBankMs;
  const elapsed = turnElapsed(turnStartedAt, now);
  if (elapsed <= ACTION_TIMER_MS) return timeBankMs;
  return Math.max(0, timeBankMs - (elapsed - ACTION_TIMER_MS));
}
