import { Redis } from "@upstash/redis";
import {
  DemoRoomEngine,
  type DemoRoomSnapshot,
} from "@/lib/demo/engine";
import { DEMO_ROOM_ID } from "@/lib/demo/constants";

const globalMem = globalThis as unknown as {
  __chipRooms?: Map<string, DemoRoomEngine>;
};

function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function chipRoomStoreUsesRedis(): boolean {
  return getRedis() !== null;
}

export function chipRoomStorageKey(roomId: string): string {
  if (roomId === DEMO_ROOM_ID) return "solanawsop:demo:room";
  return `solanawsop:chip-room:${roomId}`;
}

function memoryRooms(): Map<string, DemoRoomEngine> {
  if (!globalMem.__chipRooms) globalMem.__chipRooms = new Map();
  return globalMem.__chipRooms;
}

export async function loadChipRoom(
  roomId: string,
  opts?: { startStack?: number }
): Promise<DemoRoomEngine> {
  const redis = getRedis();
  if (!redis) {
    const mem = memoryRooms();
    const existing = mem.get(roomId);
    if (existing) return existing;
    const room = new DemoRoomEngine({ roomId, startStack: opts?.startStack });
    mem.set(roomId, room);
    return room;
  }

  const key = chipRoomStorageKey(roomId);
  const snap = await redis.get<DemoRoomSnapshot>(key);
  if (snap) return DemoRoomEngine.fromSnapshot(snap);
  return new DemoRoomEngine({ roomId, startStack: opts?.startStack });
}

export async function saveChipRoom(room: DemoRoomEngine): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    memoryRooms().set(room.roomId, room);
    return;
  }
  await redis.set(chipRoomStorageKey(room.roomId), room.toSnapshot());
}

export async function withChipRoom<T>(
  roomId: string,
  fn: (room: DemoRoomEngine) => T | Promise<T>,
  opts?: { startStack?: number }
): Promise<T> {
  const room = await loadChipRoom(roomId, opts);
  room.tick();
  const result = await fn(room);
  await saveChipRoom(room);
  return result;
}
