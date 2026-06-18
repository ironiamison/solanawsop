import { Redis } from "@upstash/redis";
import { loadChipRoom } from "@/lib/chip-room/store";
import type { DemoRoomEngine } from "@/lib/demo/engine";
import type { DemoTableInfo } from "@/lib/demo/types";
import { DEMO_BOTS_ROOM_ID, DEMO_ROOM_ID } from "./constants";

export function lobbyStatsFrom(room: DemoRoomEngine) {
  const view = room.getView();
  return {
    playerCount: view.playerCount,
    spectators: view.spectators.length,
    isFull: room.isFull(),
    maxPlayers: 6,
  };
}

const REGISTRY_KEY = "solanawsop:demo:registry";
const LEGACY_ROOM_KEY = "solanawsop:demo:room";

const globalMem = globalThis as unknown as { __demoRegistry?: string[] };

function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
  if (!url || !token) return null;
  return new Redis({ url, token });
}

export function demoTableLabel(roomId: string): string {
  if (roomId === DEMO_BOTS_ROOM_ID) return "Bots practice";
  if (roomId === DEMO_ROOM_ID) return "Table 1";
  const match = roomId.match(/-(\d+)$/);
  if (match) return `Table ${match[1]}`;
  return roomId;
}

function nextDemoRoomId(existing: string[]): string {
  let n = 2;
  while (existing.includes(`${DEMO_ROOM_ID}-${n}`)) n++;
  return `${DEMO_ROOM_ID}-${n}`;
}

async function readRegistry(): Promise<string[]> {
  const redis = getRedis();
  if (!redis) {
    if (!globalMem.__demoRegistry) {
      globalMem.__demoRegistry = [DEMO_ROOM_ID, DEMO_BOTS_ROOM_ID];
    }
    return [...globalMem.__demoRegistry];
  }

  const stored = await redis.get<string[]>(REGISTRY_KEY);
  if (stored && stored.length > 0) return stored;

  const legacy = await redis.get(LEGACY_ROOM_KEY);
  const initial = legacy
    ? [DEMO_ROOM_ID, DEMO_BOTS_ROOM_ID]
    : [DEMO_ROOM_ID, DEMO_BOTS_ROOM_ID];
  await redis.set(REGISTRY_KEY, initial);
  return initial;
}

async function writeRegistry(ids: string[]): Promise<void> {
  const unique = [...new Set(ids)];
  const redis = getRedis();
  if (!redis) {
    globalMem.__demoRegistry = unique;
    return;
  }
  await redis.set(REGISTRY_KEY, unique);
}

export async function registerDemoRoom(roomId: string): Promise<void> {
  const ids = await readRegistry();
  const next = [...ids];
  if (!next.includes(DEMO_BOTS_ROOM_ID)) next.push(DEMO_BOTS_ROOM_ID);
  if (!next.includes(roomId)) next.push(roomId);
  if (next.length !== ids.length || !ids.includes(roomId)) {
    await writeRegistry(next);
  }
}

export async function listDemoTables(): Promise<DemoTableInfo[]> {
  const ids = await readRegistry();
  return Promise.all(
    ids.map(async (roomId) => {
      const room = await loadChipRoom(roomId);
      room.repairLobbyState();
      const view = room.getView();
      const stats = lobbyStatsFrom(room);
      return {
        roomId,
        label: demoTableLabel(roomId),
        ...stats,
        phase: view.phase,
        botsOnly: roomId === DEMO_BOTS_ROOM_ID || room.botsOnlyTable,
      };
    })
  );
}

/**
 * Pick a table for a new player: preferred if not full, else first open seat,
 * else create a new table only when every registered table is full.
 */
export async function resolveDemoRoomForJoin(
  preferredRoomId?: string | null,
  preferBotsOnly = false
): Promise<string> {
  if (preferBotsOnly) {
    await registerDemoRoom(DEMO_BOTS_ROOM_ID);
    const botsRoom = await loadChipRoom(DEMO_BOTS_ROOM_ID);
    if (!botsRoom.isFull()) return DEMO_BOTS_ROOM_ID;
  }

  const ids = await readRegistry();

  if (preferredRoomId && ids.includes(preferredRoomId)) {
    const preferred = await loadChipRoom(preferredRoomId);
    if (!preferred.isFull()) return preferredRoomId;
  }

  for (const roomId of ids) {
    const room = await loadChipRoom(roomId);
    room.repairLobbyState();
    if (!room.isFull()) return roomId;
  }

  const newId = nextDemoRoomId(ids);
  ids.push(newId);
  await writeRegistry(ids);
  return newId;
}

export function normalizeDemoRoomId(
  roomId: string | null | undefined
): string {
  return roomId?.trim() || DEMO_ROOM_ID;
}

export async function getDemoRoomIds(): Promise<string[]> {
  return readRegistry();
}

export async function findDemoRoomForSession(
  sessionId: string
): Promise<string | null> {
  const ids = await readRegistry();
  for (const roomId of ids) {
    const room = await loadChipRoom(roomId);
    if (room.hasSession(sessionId)) return roomId;
  }
  return null;
}

export async function resolveDemoRoomId(
  sessionId: string | undefined,
  roomId?: string | null
): Promise<string> {
  if (sessionId) {
    const found = await findDemoRoomForSession(sessionId);
    if (found) return found;
  }
  if (roomId) return normalizeDemoRoomId(roomId);
  return DEMO_ROOM_ID;
}
