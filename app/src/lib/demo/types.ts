import type { GamePhase, PlayerStatus } from "@/lib/types";

export type DemoRole = "player" | "spectator";

export interface DemoSpectator {
  sessionId: string;
  username: string;
  socketId: string;
}

export interface DemoPlayer {
  sessionId: string;
  username: string;
  socketId: string;
  seat: number;
  stack: number;
  roundBet: number;
  totalBet: number;
  holeCards: [number, number];
  status: PlayerStatus;
  hasActed: boolean;
  /** Milliseconds of time bank left for this table session */
  timeBankMs: number;
  /** Skip the next hand but keep the seat */
  sitOutNextHand: boolean;
}

export interface DemoPlayerView {
  sessionId: string;
  username: string;
  seat: number;
  stack: number;
  roundBet: number;
  totalBet: number;
  holeCards: [number, number];
  status: PlayerStatus;
  hasActed: boolean;
  timeBankMs: number;
  sitOutNextHand: boolean;
}

export interface DemoHandWin {
  handNumber: number;
  winnerSessionIds: string[];
  pot: number;
}

export interface DemoRoomView {
  roomId: string;
  phase: GamePhase;
  pot: number;
  communityCards: number[];
  communityCount: number;
  currentBet: number;
  minRaise: number;
  dealerSeat: number;
  currentTurnSeat: number;
  buyIn: number;
  seats: (string | null)[];
  players: DemoPlayerView[];
  spectators: { sessionId: string; username: string }[];
  playerCount: number;
  statusMessage: string | null;
  handNumber: number;
  turnStartedAt: number;
  lastHandWin: DemoHandWin | null;
  /** Unix ms when the next hand auto-starts (null if not scheduled) */
  autoDealAt: number | null;
}

export type DemoAction =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raise"; amount: number };

export type DemoTableInfo = {
  roomId: string;
  label: string;
  playerCount: number;
  spectators: number;
  isFull: boolean;
  maxPlayers: number;
  phase: GamePhase;
};
