/**
 * Helius enhanced APIs — server-side only (`HELIUS_API_KEY`, never NEXT_PUBLIC).
 * Used for parsed transactions, webhooks, and backfills.
 */

const API_KEY = process.env.HELIUS_API_KEY;
const API_BASE =
  process.env.HELIUS_API_BASE ?? "https://api-mainnet.helius-rpc.com/v0";

function requireKey(): string {
  if (!API_KEY) {
    throw new Error("HELIUS_API_KEY is not set");
  }
  return API_KEY;
}

export async function heliusGetTransaction(signature: string) {
  const key = requireKey();
  const res = await fetch(
    `${API_BASE}/transactions/?api-key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactions: [signature] }),
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) {
    throw new Error(`Helius transactions API ${res.status}`);
  }
  const data = (await res.json()) as unknown[];
  return data[0] ?? null;
}

export async function heliusGetAddressTransactions(
  address: string,
  limit = 20
) {
  const key = requireKey();
  const url = new URL(
    `${API_BASE}/addresses/${address}/transactions/`
  );
  url.searchParams.set("api-key", key);
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), { next: { revalidate: 30 } });
  if (!res.ok) {
    throw new Error(`Helius address history API ${res.status}`);
  }
  return res.json();
}

export function isHeliusConfigured(): boolean {
  return Boolean(API_KEY);
}
