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
}

export type DemoAction =
  | { type: "fold" }
  | { type: "check" }
  | { type: "call" }
  | { type: "raise"; amount: number };
