import { PublicKey } from "@solana/web3.js";

export type GamePhase =
  | "waiting"
  | "preFlop"
  | "flop"
  | "turn"
  | "river"
  | "showdown";

export type PlayerStatus = "waiting" | "active" | "folded" | "allIn";

export interface RoomState {
  pubkey: PublicKey;
  buyIn: number;
  tierIndex: number;
  playerCount: number;
  pot: number;
  phase: GamePhase;
  communityCards: number[];
  communityCount: number;
  currentBet: number;
  minRaise: number;
  dealerSeat: number;
  currentTurnSeat: number;
  seats: PublicKey[];
  isPrivate: boolean;
  creator: PublicKey;
  invited: PublicKey[];
  /** Unix ms when the current player's turn began (demo server; client-estimated on-chain) */
  turnStartedAt?: number;
}

export interface PlayerState {
  pubkey: PublicKey;
  room: PublicKey;
  wallet: PublicKey;
  seat: number;
  stack: number;
  roundBet: number;
  totalBet: number;
  holeCards: number[];
  status: PlayerStatus;
  hasActed: boolean;
}
