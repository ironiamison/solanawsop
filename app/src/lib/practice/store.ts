import { DemoRoomEngine } from "@/lib/demo/engine";
import { DEMO_START_STACK } from "@/lib/demo/constants";
import { loadChipRoom, saveChipRoom } from "@/lib/chip-room/store";
import { ensurePracticeBots, processBotTurns } from "./bots";

export const PRACTICE_ROOM_PREFIX = "practice";

export function practiceRoomId(userKey: string): string {
  return `${PRACTICE_ROOM_PREFIX}-${userKey}`;
}

export async function withPracticeRoom<T>(
  userKey: string,
  fn: (room: DemoRoomEngine) => T | Promise<T>
): Promise<T> {
  const roomId = practiceRoomId(userKey);
  const room = await loadChipRoom(roomId, { startStack: DEMO_START_STACK });
  room.tick();
  processBotTurns(room);
  const result = await fn(room);
  room.tick();
  processBotTurns(room);
  await saveChipRoom(room);
  return result;
}
