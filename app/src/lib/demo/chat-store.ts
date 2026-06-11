import { Redis } from "@upstash/redis";
import { DEMO_ROOM_ID } from "@/lib/demo/constants";

export type DemoChatMessage = {
  roomId: string;
  wallet: string;
  displayName: string;
  avatar?: string;
  text: string;
  ts: number;
};

const CHAT_KEY = "solanawsop:demo:chat";
const MAX_CHAT = 150;

const globalChat = globalThis as unknown as { __demoChat?: DemoChatMessage[] };

function getRedis(): Redis | null {
  const url =
    process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL ?? "";
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN ?? "";
  if (!url || !token) return null;
  return new Redis({ url, token });
}

function memoryChat(): DemoChatMessage[] {
  if (!globalChat.__demoChat) globalChat.__demoChat = [];
  return globalChat.__demoChat;
}

export async function appendDemoChat(
  msg: Omit<DemoChatMessage, "ts" | "roomId"> & { roomId?: string }
): Promise<DemoChatMessage> {
  const entry: DemoChatMessage = {
    roomId: msg.roomId ?? DEMO_ROOM_ID,
    wallet: msg.wallet,
    displayName: msg.displayName,
    avatar: msg.avatar,
    text: msg.text.trim(),
    ts: Date.now(),
  };
  if (!entry.text) return entry;

  const redis = getRedis();
  if (redis) {
    await redis.rpush(CHAT_KEY, entry);
    await redis.ltrim(CHAT_KEY, -MAX_CHAT, -1);
  } else {
    const list = memoryChat();
    list.push(entry);
    if (list.length > MAX_CHAT) list.splice(0, list.length - MAX_CHAT);
  }
  return entry;
}

export async function listDemoChat(since = 0): Promise<DemoChatMessage[]> {
  const redis = getRedis();
  if (redis) {
    const raw = await redis.lrange<DemoChatMessage>(CHAT_KEY, 0, -1);
    const list = raw ?? [];
    return list.filter((m) => m.ts > since);
  }
  return memoryChat().filter((m) => m.ts > since);
}
