export const ACTION_TIMER_SECONDS = 30;
export const ACTION_TIMER_MS = ACTION_TIMER_SECONDS * 1000;

export function turnProgress(turnStartedAt: number | undefined, now = Date.now()): number {
  if (!turnStartedAt) return 1;
  const elapsed = now - turnStartedAt;
  return Math.max(0, 1 - elapsed / ACTION_TIMER_MS);
}

export function secondsRemaining(turnStartedAt: number | undefined, now = Date.now()): number {
  if (!turnStartedAt) return ACTION_TIMER_SECONDS;
  const remaining = ACTION_TIMER_MS - (now - turnStartedAt);
  return Math.max(0, Math.ceil(remaining / 1000));
}

export function isTurnExpired(turnStartedAt: number | undefined, now = Date.now()): boolean {
  if (!turnStartedAt) return false;
  return now - turnStartedAt >= ACTION_TIMER_MS;
}
