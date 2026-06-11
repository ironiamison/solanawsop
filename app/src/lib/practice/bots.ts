import type { DemoRoomEngine } from "@/lib/demo/engine";
import { DEMO_MAX_PLAYERS } from "@/lib/demo/constants";
import {
  botDisplayName,
  botSessionId,
  isBotSession,
  pickBotAction,
} from "./bot-ai";

export function ensurePracticeBots(room: DemoRoomEngine): void {
  if (room.phase !== "waiting") return;
  const hasHuman = room.getView().players.some(
    (p) => !isBotSession(p.sessionId)
  );
  if (!hasHuman) return;

  for (let seat = 0; seat < DEMO_MAX_PLAYERS; seat++) {
    const occupied = room.getView().players.some((p) => p.seat === seat);
    if (occupied) continue;
    room.addBotPlayer(seat, botSessionId(seat), botDisplayName(seat));
  }
}

export function processBotTurns(room: DemoRoomEngine, max = 12): boolean {
  let changed = false;
  let safety = 0;
  while (safety < max) {
    const view = room.getView();
    if (!["preFlop", "flop", "turn", "river"].includes(view.phase)) break;

    const actor = view.players.find((p) => p.seat === view.currentTurnSeat);
    if (!actor || !isBotSession(actor.sessionId) || actor.status !== "active") {
      break;
    }

    const result = room.playerAction(
      actor.sessionId,
      pickBotAction(room, actor.sessionId)
    );
    if (!result.ok) break;
    changed = true;
    safety++;
  }
  return changed;
}
