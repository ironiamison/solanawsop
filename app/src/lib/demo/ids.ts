import { PublicKey } from "@solana/web3.js";

export function newSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Deterministic pubkey for demo seat identity (works in browser + server) */
export function sessionToPubkey(sessionId: string): PublicKey {
  const bytes = new Uint8Array(32);
  const src = new TextEncoder().encode(`demo-player:${sessionId}`);
  for (let i = 0; i < 32; i++) {
    bytes[i] = src[i % src.length] ^ ((i * 37) & 0xff);
  }
  return new PublicKey(bytes);
}

/** Trim, spaces → underscores, strip invalid chars */
export function normalizeUsername(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 16);
}

export function validateUsername(raw: string): string | null {
  const name = normalizeUsername(raw);
  if (name.length < 2) return null;
  if (!/^[a-zA-Z0-9_]+$/.test(name)) return null;
  return name;
}

export const DEMO_SESSION_STORAGE_KEY = "poker-demo-session";
export const DEMO_ROOM_STORAGE_KEY = "poker-demo-room";
export const DEMO_USERNAME_STORAGE_KEY = "poker-demo-username";
