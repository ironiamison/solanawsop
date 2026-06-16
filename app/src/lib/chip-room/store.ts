import { Redis } from "@upstash/redis";
import {
  DemoRoomEngine,
  type DemoRoomSnapshot,
} from "@/lib/demo/engine";
import { DEMO_ROOM_ID } from "@/lib/demo/constants";

const globalMem = globalThis as unknown as {
  __chipRooms?: Map<string, DemoRoomEngine>;
};

const LOCK_WAIT_MS = 12_000;
const LOCK_TTL_SEC = 15;
const LOCK_ATTEMPTS = 2;

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
  if (roomId.startsWith("demo-playroom")) {
    return `solanawsop:demo:room:${roomId}`;
  }
  return `solanawsop:chip-room:${roomId}`;
}

function lockKey(roomId: string): string {
  return `solanawsop:lock:${roomId}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireLock(redis: Redis, roomId: string): Promise<boolean> {
  const key = lockKey(roomId);
  const deadline = Date.now() + LOCK_WAIT_MS;
  while (Date.now() < deadline) {
    const ok = await redis.set(key, "1", { nx: true, ex: LOCK_TTL_SEC });
    if (ok === "OK") return true;
    await sleep(40);
  }
  return false;
}

async function releaseLock(redis: Redis, roomId: string): Promise<void> {
  try {
    await redis.del(lockKey(roomId));
  } catch {
    // expires automatically
  }
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
    if (existing) {
      existing.repairLobbyState();
      return existing;
    }
    const room = new DemoRoomEngine({ roomId, startStack: opts?.startStack });
    mem.set(roomId, room);
    return room;
  }

  const key = chipRoomStorageKey(roomId);
  const snap = await redis.get<DemoRoomSnapshot>(key);
  const room = snap
    ? DemoRoomEngine.fromSnapshot(snap)
    : new DemoRoomEngine({ roomId, startStack: opts?.startStack });
  room.repairLobbyState();
  return room;
}

export async function saveChipRoom(room: DemoRoomEngine): Promise<void> {
  const redis = getRedis();
  room.reconcileSeats();
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
  const redis = getRedis();
  if (!redis) {
    const room = await loadChipRoom(roomId, opts);
    room.tick();
    const result = await fn(room);
    room.reconcileSeats();
    room.bumpRevision();
    await saveChipRoom(room);
    return result;
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt++) {
    const locked = await acquireLock(redis, roomId);
    if (!locked) {
      lastError = new Error("Table busy — try again");
      if (attempt + 1 < LOCK_ATTEMPTS) {
        await sleep(120 + attempt * 180);
        continue;
      }
      throw lastError;
    }

    try {
      const room = await loadChipRoom(roomId, opts);
      room.tick();
    const result = await fn(room);
    room.bumpRevision();
    await saveChipRoom(room);
    return result;
    } finally {
      await releaseLock(redis, roomId);
    }
  }

  throw lastError ?? new Error("Table busy — try again");
}
