import type { DemoRoomEngine } from "@/lib/demo/engine";
import type { DemoAction } from "@/lib/demo/types";

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

/** Simple exploitable bot — calls often, occasionally raises, folds to big bets */
export function pickBotAction(
  room: DemoRoomEngine,
  sessionId: string
): DemoAction {
  const player = room.findPlayer(sessionId);
  const view = room.getView(sessionId);
  if (!player || !view) return { type: "fold" };

  const callAmount = Math.max(0, view.currentBet - player.roundBet);
  const canCheck = callAmount === 0;
  const roll = Math.random();

  if (!canCheck && callAmount > player.stack * 0.35 && roll < 0.55) {
    return { type: "fold" };
  }

  if (canCheck && roll < 0.72) {
    return { type: "check" };
  }

  if (!canCheck && roll < 0.78) {
    return { type: "call" };
  }

  const minRaise = view.minRaise || 50_000_000;
  const raiseIncrement = Math.min(
    player.stack - callAmount,
    Math.max(minRaise, Math.floor(view.pot * 0.5))
  );

  if (raiseIncrement >= minRaise && player.stack > callAmount + minRaise) {
    return { type: "raise", amount: raiseIncrement };
  }

  if (canCheck) return { type: "check" };
  if (callAmount <= player.stack) return { type: "call" };
  return { type: "fold" };
}
