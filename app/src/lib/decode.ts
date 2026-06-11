import { PublicKey } from "@solana/web3.js";
import { GamePhase, PlayerState, PlayerStatus, RoomState } from "./types";

function readU8(buf: Buffer, offset: number): [number, number] {
  return [buf.readUInt8(offset), offset + 1];
}

function readU64(buf: Buffer, offset: number): [bigint, number] {
  return [buf.readBigUInt64LE(offset), offset + 8];
}

function readBool(buf: Buffer, offset: number): [boolean, number] {
  return [buf.readUInt8(offset) === 1, offset + 1];
}

function readPubkey(buf: Buffer, offset: number): [PublicKey, number] {
  return [new PublicKey(buf.subarray(offset, offset + 32)), offset + 32];
}

function decodePhase(value: number): GamePhase {
  const phases: GamePhase[] = [
    "waiting",
    "preFlop",
    "flop",
    "turn",
    "river",
    "showdown",
  ];
  return phases[value] ?? "waiting";
}

function decodePlayerStatus(value: number): PlayerStatus {
  const statuses: PlayerStatus[] = ["waiting", "active", "folded", "allIn"];
  return statuses[value] ?? "waiting";
}

export function decodeRoom(pubkey: PublicKey, data: Buffer): RoomState {
  let offset = 8;
  const [buyIn] = readU64(data, offset);
  offset += 8;
  const [tierIndex] = readU8(data, offset);
  offset += 1;
  const [playerCount] = readU8(data, offset);
  offset += 1;
  const [pot] = readU64(data, offset);
  offset += 8;
  const [phaseRaw] = readU8(data, offset);
  offset += 1;
  const communityCards: number[] = [];
  for (let i = 0; i < 5; i++) {
    const [c] = readU8(data, offset);
    communityCards.push(c);
    offset += 1;
  }
  const [communityCount] = readU8(data, offset);
  offset += 1;
  const [currentBet] = readU64(data, offset);
  offset += 8;
  const [minRaise] = readU64(data, offset);
  offset += 8;
  const [dealerSeat] = readU8(data, offset);
  offset += 1;
  const [currentTurnSeat] = readU8(data, offset);
  offset += 1;
  offset += 1; // last_raiser_seat
  offset += 1; // active_count
  const deck: number[] = [];
  for (let i = 0; i < 52; i++) {
    const [c] = readU8(data, offset);
    deck.push(c);
    offset += 1;
  }
  offset += 1; // deck_pos
  const [handNumber] = readU64(data, offset);
  offset += 8;
  const [gameSeed] = readU64(data, offset);
  offset += 8;

  // Legacy rooms (pre-VRF) omit vrf_seed + deck_commitment (64 bytes).
  const hasVrfFields = data.length >= offset + 64 + 32;
  const vrfSeed = hasVrfFields
    ? new Uint8Array(data.subarray(offset, offset + 32))
    : new Uint8Array(32);
  if (hasVrfFields) offset += 32;
  const deckCommitment = hasVrfFields
    ? new Uint8Array(data.subarray(offset, offset + 32))
    : new Uint8Array(32);
  if (hasVrfFields) offset += 32;

  const seats: PublicKey[] = [];
  for (let i = 0; i < 6; i++) {
    const [pk] = readPubkey(data, offset);
    seats.push(pk);
    offset += 32;
  }

  const [isPrivateRaw] = readU8(data, offset);
  offset += 1;
  const [creator] = readPubkey(data, offset);
  offset += 32;
  const invited: PublicKey[] = [];
  for (let i = 0; i < 6; i++) {
    const [pk] = readPubkey(data, offset);
    invited.push(pk);
    offset += 32;
  }

  return {
    pubkey,
    buyIn: Number(buyIn),
    tierIndex,
    playerCount,
    pot: Number(pot),
    phase: decodePhase(phaseRaw),
    communityCards,
    communityCount,
    currentBet: Number(currentBet),
    minRaise: Number(minRaise),
    dealerSeat,
    currentTurnSeat,
    seats,
    isPrivate: isPrivateRaw === 1,
    creator,
    invited,
    handNumber: Number(handNumber),
    gameSeed,
    vrfSeed,
    deckCommitment,
    deck,
  };
}

export function decodePlayer(pubkey: PublicKey, data: Buffer): PlayerState {
  let offset = 8;
  const [room] = readPubkey(data, offset);
  offset += 32;
  const [wallet] = readPubkey(data, offset);
  offset += 32;
  const [seat] = readU8(data, offset);
  offset += 1;
  const [stack] = readU64(data, offset);
  offset += 8;
  const [roundBet] = readU64(data, offset);
  offset += 8;
  const [totalBet] = readU64(data, offset);
  offset += 8;
  const holeCards: number[] = [];
  for (let i = 0; i < 2; i++) {
    const [c] = readU8(data, offset);
    holeCards.push(c);
    offset += 1;
  }

  const hasCommitFields = data.length >= offset + 64 + 1 + 32 + 1;
  let holeRevealed = false;
  if (hasCommitFields) {
    offset += 64; // hole_commitments
    [holeRevealed] = readBool(data, offset);
    offset += 1;
    offset += 32; // entropy_commitment
  }

  const [statusRaw] = readU8(data, offset);
  offset += 1;
  const [hasActed] = readBool(data, offset);

  return {
    pubkey,
    room,
    wallet,
    seat,
    stack: Number(stack),
    roundBet: Number(roundBet),
    totalBet: Number(totalBet),
    holeCards,
    holeRevealed,
    status: decodePlayerStatus(statusRaw),
    hasActed,
  };
}

export function isEmptySeat(seat: PublicKey): boolean {
  return seat.equals(PublicKey.default);
}
