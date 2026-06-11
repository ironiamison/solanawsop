import { BorshCoder, EventParser, Idl } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import idlJson from "@/idl/solana_poker.json";
import { PROGRAM_ID } from "@/lib/constants";

const eventParser = new EventParser(
  PROGRAM_ID,
  new BorshCoder(idlJson as Idl)
);

export type HoleCardsDealtEvent = {
  wallet: PublicKey;
  card0: number;
  card1: number;
};

/** Parse `HoleCardsDealt` anchor events from a confirmed transaction. */
export async function parseHoleCardsDealt(
  connection: Connection,
  signature: string
): Promise<HoleCardsDealtEvent[]> {
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  if (!tx?.meta?.logMessages) return [];

  const out: HoleCardsDealtEvent[] = [];
  for (const event of eventParser.parseLogs(tx.meta.logMessages)) {
    if (event.name !== "HoleCardsDealt") continue;
    const d = event.data as {
      wallet: PublicKey;
      card0?: number;
      card1?: number;
      card_0?: number;
      card_1?: number;
    };
    out.push({
      wallet: new PublicKey(d.wallet),
      card0: d.card0 ?? d.card_0 ?? 255,
      card1: d.card1 ?? d.card_1 ?? 255,
    });
  }
  return out;
}

const HOLE_CACHE_KEY = "wsop-hole-cache";

export function cacheHoleCards(
  room: string,
  handNumber: number,
  wallet: string,
  cards: [number, number]
) {
  if (typeof sessionStorage === "undefined") return;
  const raw = sessionStorage.getItem(HOLE_CACHE_KEY);
  const map = raw ? (JSON.parse(raw) as Record<string, [number, number]>) : {};
  map[`${room}:${handNumber}:${wallet}`] = cards;
  sessionStorage.setItem(HOLE_CACHE_KEY, JSON.stringify(map));
}

export function getCachedHoleCards(
  room: string,
  handNumber: number,
  wallet: string
): [number, number] | null {
  if (typeof sessionStorage === "undefined") return null;
  const raw = sessionStorage.getItem(HOLE_CACHE_KEY);
  if (!raw) return null;
  const map = JSON.parse(raw) as Record<string, [number, number]>;
  return map[`${room}:${handNumber}:${wallet}`] ?? null;
}
