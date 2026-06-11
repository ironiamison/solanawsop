import { Redis } from "@upstash/redis";
import { DemoRoomEngine, type DemoRoomSnapshot } from "@/lib/demo/engine";

const ROOM_KEY = "solanawsop:demo:room";

const globalMem = globalThis as unknown as { __demoRoom?: DemoRoomEngine };

function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function demoStoreUsesRedis(): boolean {
  return getRedis() !== null;
}

function getMemoryRoom(): DemoRoomEngine {
  if (!globalMem.__demoRoom) {
    globalMem.__demoRoom = new DemoRoomEngine();
  }
  return globalMem.__demoRoom;
}

export async function loadDemoRoom(): Promise<DemoRoomEngine> {
  const redis = getRedis();
  if (!redis) return getMemoryRoom();

  const snap = await redis.get<DemoRoomSnapshot>(ROOM_KEY);
  return snap ? DemoRoomEngine.fromSnapshot(snap) : new DemoRoomEngine();
}

export async function saveDemoRoom(room: DemoRoomEngine): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    globalMem.__demoRoom = room;
    return;
  }
  await redis.set(ROOM_KEY, room.toSnapshot());
}

/** Load → mutate → save. Required on Vercel so all players share one table. */
export async function withDemoRoom<T>(
  fn: (room: DemoRoomEngine) => T | Promise<T>
): Promise<T> {
  const room = await loadDemoRoom();
  room.tick();
  const result = await fn(room);
  await saveDemoRoom(room);
  return result;
}
