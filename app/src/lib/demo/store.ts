import { Redis } from "@upstash/redis";
import { DemoRoomEngine, type DemoRoomSnapshot } from "@/lib/demo/engine";

const ROOM_KEY = "solanawsop:demo:room";
const LOCK_KEY = "solanawsop:demo:lock";
const LOCK_TTL_SEC = 8;
const LOCK_WAIT_MS = 2_500;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireLock(redis: Redis): Promise<boolean> {
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    const ok = await redis.set(LOCK_KEY, "1", { nx: true, ex: LOCK_TTL_SEC });
    if (ok === "OK") return true;
    await sleep(40);
  }
  return false;
}

async function releaseLock(redis: Redis): Promise<void> {
  try {
    await redis.del(LOCK_KEY);
  } catch {
    // lock expires on its own
  }
}

export async function loadDemoRoom(): Promise<DemoRoomEngine> {
  const redis = getRedis();
  if (!redis) return getMemoryRoom();

  const snap = await redis.get<DemoRoomSnapshot>(ROOM_KEY);
  const room = snap ? DemoRoomEngine.fromSnapshot(snap) : new DemoRoomEngine();
  room.reconcileSeats();
  return room;
}

export async function saveDemoRoom(room: DemoRoomEngine): Promise<void> {
  const redis = getRedis();
  if (!redis) {
    globalMem.__demoRoom = room;
    return;
  }
  room.reconcileSeats();
  await redis.set(ROOM_KEY, room.toSnapshot());
}

/** Load → mutate → save. Serialized on Redis to prevent split-brain seat maps. */
export async function withDemoRoom<T>(
  fn: (room: DemoRoomEngine) => T | Promise<T>
): Promise<T> {
  const redis = getRedis();
  if (!redis) {
    const room = getMemoryRoom();
    room.reconcileSeats();
    room.tick();
    const result = await fn(room);
    room.reconcileSeats();
    globalMem.__demoRoom = room;
    return result;
  }

  const locked = await acquireLock(redis);
  if (!locked) {
    throw new Error("Demo table busy — try again");
  }

  try {
    const room = await loadDemoRoom();
    room.tick();
    const result = await fn(room);
    await saveDemoRoom(room);
    return result;
  } finally {
    await releaseLock(redis);
  }
}
