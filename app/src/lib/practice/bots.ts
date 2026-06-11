import type { DemoRoomEngine } from "@/lib/demo/engine";
import { DEMO_MAX_PLAYERS } from "@/lib/demo/constants";
import {
  botDisplayName,
  botSessionId,
  isBotSession,
  pickBotAction,
} from "./bot-ai";

/** Drop bots that lost their seat after reconcile. */
function pruneOrphanBots(room: DemoRoomEngine): void {
  const view = room.getView();
  for (const p of view.players) {
    if (!isBotSession(p.sessionId)) continue;
    if (view.seats[p.seat] !== p.sessionId) {
      room.removePlayer(p.sessionId);
    }
  }
}

export function ensurePracticeBots(room: DemoRoomEngine): void {
  if (room.phase !== "waiting") return;

  room.repairLobbyState();

  const view = room.getView();
  const hasHuman = view.players.some((p) => !isBotSession(p.sessionId));
  if (!hasHuman) {
    for (const p of view.players) {
      if (isBotSession(p.sessionId)) room.removePlayer(p.sessionId);
    }
    return;
  }

  pruneOrphanBots(room);

  const seats = room.getView().seats;
  for (let seat = 0; seat < DEMO_MAX_PLAYERS; seat++) {
    if (seats[seat]) continue;
    room.addBotPlayer(seat, botSessionId(seat), botDisplayName(seat));
  }

  room.reconcileSeats();
  room.scheduleAutoDealIfReady();
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
