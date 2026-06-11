import { PROGRAM_ID, TOKEN_SYMBOL } from "@/lib/constants";

export type FairnessMode = "onchain-cash" | "demo" | "offchain-chips";

export function fairnessModeLabel(mode: FairnessMode): string {
  switch (mode) {
    case "onchain-cash":
      return "On-chain escrow";
    case "demo":
      return "Free play";
    case "offchain-chips":
      return "Play chips";
  }
}

export function fairnessModeSummary(mode: FairnessMode): string {
  switch (mode) {
    case "onchain-cash":
      return `Real ${TOKEN_SYMBOL} in program vault · every join, action, and leave is a Solana transaction`;
    case "demo":
      return "Practice table — server chips, not on-chain";
    case "offchain-chips":
      return `Invite tables — ${TOKEN_SYMBOL} play chips on server until SPL escrow join`;
  }
}

export const PROGRAM_ID_TEXT = PROGRAM_ID.toBase58();
