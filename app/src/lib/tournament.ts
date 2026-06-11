import { WEEKLY_TOURNAMENT } from "@/lib/constants";

export function nextWeeklyTournamentStart(): Date {
  const now = new Date();
  const target = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      WEEKLY_TOURNAMENT.hourUtc,
      WEEKLY_TOURNAMENT.minuteUtc,
      0,
      0
    )
  );

  const day = now.getUTCDay();
  const daysUntilFriday = (5 - day + 7) % 7;
  target.setUTCDate(target.getUTCDate() + daysUntilFriday);

  if (target.getTime() <= now.getTime()) {
    target.setUTCDate(target.getUTCDate() + 7);
  }

  return target;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return "Live now";
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
