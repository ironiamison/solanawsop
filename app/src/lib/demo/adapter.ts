import { PublicKey } from "@solana/web3.js";
import { playerAvatarUrl } from "@/lib/avatars";
import type { PlayerState, RoomState } from "@/lib/types";
import { sessionToPubkey } from "./ids";
import type { DemoRoomView } from "./types";

const DEMO_ROOM_PUBKEY = sessionToPubkey("demo-room-anchor");

export function demoViewToRoom(view: DemoRoomView): RoomState {
  const seats = view.seats.map((sid) =>
    sid ? sessionToPubkey(sid) : PublicKey.default
  );

  return {
    pubkey: DEMO_ROOM_PUBKEY,
    buyIn: view.buyIn,
    tierIndex: 0,
    playerCount: view.playerCount,
    pot: view.pot,
    phase: view.phase,
    communityCards: view.communityCards,
    communityCount: view.communityCount,
    currentBet: view.currentBet,
    minRaise: view.minRaise,
    dealerSeat: view.dealerSeat,
    currentTurnSeat: view.currentTurnSeat,
    seats,
    isPrivate: false,
    creator: PublicKey.default,
    invited: [],
    turnStartedAt: view.turnStartedAt || undefined,
  };
}

export function demoViewToPlayers(view: DemoRoomView): PlayerState[] {
  return view.players.map((p) => ({
    pubkey: sessionToPubkey(p.sessionId),
    room: DEMO_ROOM_PUBKEY,
    wallet: sessionToPubkey(p.sessionId),
    seat: p.seat,
    stack: p.stack,
    roundBet: p.roundBet,
    totalBet: p.totalBet,
    holeCards: [...p.holeCards],
    status: p.status,
    hasActed: p.hasActed,
  }));
}

export function demoNameOverrides(view: DemoRoomView): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of view.players) {
    map[sessionToPubkey(p.sessionId).toBase58()] = p.username;
  }
  return map;
}

export function demoAvatarOverrides(view: DemoRoomView): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of view.players) {
    map[sessionToPubkey(p.sessionId).toBase58()] = playerAvatarUrl(p.username);
  }
  for (const s of view.spectators) {
    map[sessionToPubkey(s.sessionId).toBase58()] = playerAvatarUrl(s.username);
  }
  return map;
}
