import { Connection } from "@solana/web3.js";
import { activeRpcUrl } from "@/lib/rpc-url";

let shared: Connection | null = null;
let sharedUrl: string | null = null;

/** One Connection for the app — avoids duplicate RPC clients and retry storms. */
export function getSolanaConnection(): Connection {
  const url = activeRpcUrl();
  if (!shared || sharedUrl !== url) {
    shared = new Connection(url, {
      commitment: "confirmed",
      /** Fail fast on 429 instead of 4× console retries per call. */
      disableRetryOnRateLimit: true,
    });
    sharedUrl = url;
  }
  return shared;
}

export function solanaRpcUrl(): string {
  return activeRpcUrl();
}
