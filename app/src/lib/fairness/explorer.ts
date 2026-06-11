import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, SOLANA_NETWORK } from "@/lib/constants";

function clusterQuery(): string {
  return SOLANA_NETWORK === "mainnet-beta"
    ? ""
    : `?cluster=${SOLANA_NETWORK}`;
}

export function explorerAccountUrl(address: string | PublicKey): string {
  const addr = typeof address === "string" ? address : address.toBase58();
  return `https://solscan.io/account/${addr}${clusterQuery()}`;
}

export function explorerProgramUrl(): string {
  return explorerAccountUrl(PROGRAM_ID);
}

export function explorerInstructionUrl(signature: string): string {
  return `https://solscan.io/tx/${signature}${clusterQuery()}`;
}
