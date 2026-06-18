import type { DemoRoomEngine } from "@/lib/demo/engine";
import type { BotDifficulty, DemoAction } from "@/lib/demo/types";

const BOT_NAMES = ["Ace", "Bluff", "Shark", "Nit", "Whale", "River"];

export function botDisplayName(seat: number): string {
  return BOT_NAMES[seat % BOT_NAMES.length];
}

export function botSessionId(seat: number): string {
  return `bot-seat-${seat}`;
}

export function isBotSession(sessionId: string): boolean {
  return sessionId.startsWith("bot-seat-");
}

type DifficultyProfile = {
  foldMult: number;
  raiseMult: number;
  callMult: number;
};

const DIFFICULTY: Record<BotDifficulty, DifficultyProfile> = {
  casual: { foldMult: 1.45, raiseMult: 0.55, callMult: 0.82 },
  standard: { foldMult: 1, raiseMult: 1, callMult: 1 },
  shark: { foldMult: 0.55, raiseMult: 1.35, callMult: 1.08 },
};

/** Demo bot — checks/calls often; difficulty tunes aggression */
export function pickBotAction(
  room: DemoRoomEngine,
  sessionId: string
): DemoAction {
  const player = room.findPlayer(sessionId);
  const view = room.getView(sessionId);
  if (!player || !view) return { type: "fold" };

  const profile = DIFFICULTY[room.botDifficulty] ?? DIFFICULTY.standard;
  const callAmount = Math.max(0, view.currentBet - player.roundBet);
  const canCheck = callAmount === 0;
  const roll = Math.random();
  const potOdds = view.pot > 0 ? callAmount / (view.pot + callAmount) : 1;

  if (
    !canCheck &&
    callAmount > player.stack * 0.5 &&
    roll < 0.25 * profile.foldMult
  ) {
    return { type: "fold" };
  }

  if (!canCheck && potOdds > 0.45 && roll < 0.35 * profile.foldMult) {
    return { type: "fold" };
  }

  if (canCheck && roll < 0.45 * profile.callMult) {
    return { type: "check" };
  }

  if (!canCheck && roll < 0.88 * profile.callMult) {
    return { type: "call" };
  }

  const minRaise = view.minRaise || 50_000_000;
  const raiseIncrement = Math.min(
    player.stack - callAmount,
    Math.max(minRaise, Math.floor(view.pot * (0.45 + 0.2 * profile.raiseMult)))
  );

  if (
    raiseIncrement >= minRaise &&
    player.stack > callAmount + minRaise &&
    roll > 0.35 / profile.raiseMult
  ) {
    return { type: "raise", amount: raiseIncrement };
  }

  if (canCheck) return { type: "check" };
  if (callAmount <= player.stack) return { type: "call" };
  return { type: "fold" };
}
