export const DEMO_ROOM_ID = "demo-playroom";
export const DEMO_MAX_PLAYERS = 6;
/** 100,000 play chips (6 decimal places, matches formatTokens) */
export const DEMO_START_STACK = 100_000_000_000;
export const DEMO_SMALL_BLIND = 25_000_000;
export const DEMO_BIG_BLIND = 50_000_000;
export const DEMO_BUY_IN = DEMO_START_STACK;
/** Pause between hands before auto-dealing the next one */
export const AUTO_DEAL_DELAY_MS = 3000;
/** First hand after the second player sits — deal on next server tick */
export const AUTO_DEAL_FIRST_HAND_MS = 0;
/** Remove seated humans who stopped polling / closed the tab */
export const PLAYER_ABSENT_PRUNE_MS = 120_000;
/** Fold absent humans quickly instead of burning the full action timer */
export const PLAYER_ABSENT_FOLD_MS = 12_000;
/** Reveal winner/cards before clearing — must be timestamp-driven (serverless-safe) */
export const SHOWDOWN_DELAY_MS = 3500;
export {
  ACTION_TIMER_SECONDS,
  ACTION_TIMER_MS,
  TIME_BANK_SECONDS,
  TIME_BANK_MS,
} from "@/lib/game/turnTimer";
