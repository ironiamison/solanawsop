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
  /** On-chain hand index (0 between hands) */
  handNumber?: number;
  /** Deterministic shuffle seed written at deal */
  gameSeed?: bigint;
  /** SlotHashes-derived VRF seed (32 bytes) */
  vrfSeed?: Uint8Array;
  /** SHA-256 commitment to shuffled deck + vrf seed */
  deckCommitment?: Uint8Array;
  /** Full deck order on-chain (revealed at showdown) */
  deck?: number[];
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
  holeRevealed?: boolean;
  status: PlayerStatus;
  hasActed: boolean;
}
