import type { DemoRoomEngine } from "@/lib/demo/engine";
import { DEMO_ROOM_ID } from "@/lib/demo/constants";
import { ensurePracticeBots, processBotTurns } from "@/lib/practice/bots";

export function isDemoPlayroom(roomId: string): boolean {
  return roomId === DEMO_ROOM_ID || roomId.startsWith(`${DEMO_ROOM_ID}-`);
}

/** Prune ghosts, backfill seats with bots, and run bot actions between human turns. */
export function runDemoMaintenance(room: DemoRoomEngine): boolean {
  if (!isDemoPlayroom(room.roomId)) return false;

  let changed = room.pruneInactivePlayers();
  ensurePracticeBots(room);
  if (processBotTurns(room)) changed = true;
  if (room.tick()) changed = true;
  return changed;
}
