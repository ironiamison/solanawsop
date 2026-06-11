export type SolanaCluster = "devnet" | "mainnet-beta";

/** Browser-safe RPC URL (uses only NEXT_PUBLIC_* env). */
export function clientRpcUrl(network?: SolanaCluster): string {
  const net =
    network ??
    (process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
      ? "mainnet-beta"
      : "devnet");

  if (net === "mainnet-beta") {
    return (
      process.env.NEXT_PUBLIC_MAINNET_RPC_URL ??
      "https://api.mainnet-beta.solana.com"
    );
  }

  return process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com";
}

export function clientWsUrl(network?: SolanaCluster): string {
  return clientRpcUrl(network)
    .replace("https://", "wss://")
    .replace("http://", "ws://");
}

/** Active cluster from env — matches `constants.ts` default. */
export function activeCluster(): SolanaCluster {
  return process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta"
    ? "mainnet-beta"
    : "devnet";
}

export function activeRpcUrl(): string {
  return clientRpcUrl(activeCluster());
}
