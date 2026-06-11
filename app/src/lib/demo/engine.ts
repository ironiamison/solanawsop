import type { GamePhase, PlayerStatus } from "@/lib/types";
import { ACTION_TIMER_MS } from "@/lib/game/turnTimer";
import {
  DEMO_BIG_BLIND,
  DEMO_BUY_IN,
  DEMO_MAX_PLAYERS,
  DEMO_ROOM_ID,
  DEMO_SMALL_BLIND,
  DEMO_START_STACK,
} from "./constants";
import { compareHands, evaluateHand } from "./handEval";
import type { DemoAction, DemoPlayer, DemoRoomView, DemoSpectator } from "./types";

const EMPTY_CARD = 255;

function initDeck(): number[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

function shuffleDeck(deck: number[], seed: number): void {
  const mul = BigInt("6364136223846793005");
  const mask = (BigInt(1) << BigInt(64)) - BigInt(1);
  let state = BigInt(seed);
  for (let i = deck.length - 1; i > 0; i--) {
    state = (state * mul + BigInt(1)) & mask;
    const j = Number(state % BigInt(i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

export class DemoRoomEngine {
  readonly roomId = DEMO_ROOM_ID;
  phase: GamePhase = "waiting";
  pot = 0;
  communityCards = [EMPTY_CARD, EMPTY_CARD, EMPTY_CARD, EMPTY_CARD, EMPTY_CARD];
  communityCount = 0;
  currentBet = 0;
  minRaise = DEMO_BIG_BLIND;
  dealerSeat = 0;
  currentTurnSeat = 0;
  turnStartedAt = 0;
  lastRaiserSeat = 0;
  activeCount = 0;
  deck = initDeck();
  deckPos = 0;
  handNumber = 0;
  statusMessage: string | null = null;

  private showdownTimer: ReturnType<typeof setTimeout> | null = null;
  private stateListeners = new Set<() => void>();
  private players = new Map<string, DemoPlayer>();
  private spectators = new Map<string, DemoSpectator>();
  private seatToSession: (string | null)[] = Array(DEMO_MAX_PLAYERS).fill(null);

  onStateChange(listener: () => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private emitStateChange(): void {
    for (const listener of this.stateListeners) listener();
  }

  private clearShowdownTimer(): void {
    if (this.showdownTimer) {
      clearTimeout(this.showdownTimer);
      this.showdownTimer = null;
    }
  }

  get playerCount(): number {
    return this.players.size;
  }

  isFull(): boolean {
    return this.players.size >= DEMO_MAX_PLAYERS;
  }

  findBySocket(socketId: string): DemoPlayer | DemoSpectator | null {
    for (const p of this.players.values()) {
      if (p.socketId === socketId) return p;
    }
    for (const s of this.spectators.values()) {
      if (s.socketId === socketId) return s;
    }
    return null;
  }

  findPlayer(sessionId: string): DemoPlayer | undefined {
    return this.players.get(sessionId);
  }

  rebindSocket(sessionId: string, socketId: string): void {
    const player = this.players.get(sessionId);
    if (player) {
      player.socketId = socketId;
      return;
    }
    const spec = this.spectators.get(sessionId);
    if (spec) spec.socketId = socketId;
  }

  hasSession(sessionId: string): boolean {
    return this.players.has(sessionId) || this.spectators.has(sessionId);
  }

  usernameTaken(name: string, exceptSessionId?: string): boolean {
    const lower = name.toLowerCase();
    for (const p of this.players.values()) {
      if (p.sessionId !== exceptSessionId && p.username.toLowerCase() === lower) return true;
    }
    for (const s of this.spectators.values()) {
      if (s.sessionId !== exceptSessionId && s.username.toLowerCase() === lower) return true;
    }
    return false;
  }

  joinAsPlayer(
    sessionId: string,
    username: string,
    socketId: string
  ): { ok: true } | { ok: false; error: string } {
    if (this.phase !== "waiting") {
      return { ok: false, error: "Hand in progress — spectate until someone leaves" };
    }
    if (this.isFull()) {
      return { ok: false, error: "Table full — join as spectator" };
    }
    this.spectators.delete(sessionId);
    const existing = this.players.get(sessionId);
    if (existing) {
      existing.socketId = socketId;
      existing.username = username;
      return { ok: true };
    }
    const seat = this.seatToSession.findIndex((s) => s === null);
    if (seat < 0) return { ok: false, error: "No open seats" };

    const player: DemoPlayer = {
      sessionId,
      username,
      socketId,
      seat,
      stack: DEMO_START_STACK,
      roundBet: 0,
      totalBet: 0,
      holeCards: [EMPTY_CARD, EMPTY_CARD],
      status: "waiting",
      hasActed: false,
    };
    this.players.set(sessionId, player);
    this.seatToSession[seat] = sessionId;
    return { ok: true };
  }

  joinAsSpectator(sessionId: string, username: string, socketId: string): void {
    this.players.delete(sessionId);
    const seatIdx = this.seatToSession.findIndex((s) => s === sessionId);
    if (seatIdx >= 0) this.seatToSession[seatIdx] = null;

    this.spectators.set(sessionId, { sessionId, username, socketId });
  }

  leaveSeat(sessionId: string): { ok: true } | { ok: false; error: string } {
    const player = this.players.get(sessionId);
    if (!player) return { ok: false, error: "Not seated" };
    if (this.phase !== "waiting") {
      return { ok: false, error: "Can only leave between hands" };
    }
    this.players.delete(sessionId);
    this.seatToSession[player.seat] = null;
    return { ok: true };
  }

  disconnect(socketId: string): void {
    const entry = this.findBySocket(socketId);
    if (!entry) return;

    if ("seat" in entry) {
      if (this.phase === "waiting") {
        this.players.delete(entry.sessionId);
        this.seatToSession[entry.seat] = null;
      } else if (entry.status === "active") {
        entry.status = "folded";
        entry.hasActed = true;
        this.activeCount = Math.max(0, this.activeCount - 1);
        this.maybeAwardFoldWin();
        this.advanceAfterAction();
      }
    } else {
      this.spectators.delete(entry.sessionId);
    }
  }

  startHand(requesterId: string): { ok: true } | { ok: false; error: string } {
    this.clearShowdownTimer();
    if (this.phase !== "waiting") return { ok: false, error: "Hand already running" };
    if (this.players.size < 2) return { ok: false, error: "Need at least 2 players" };

    this.handNumber++;
    const seed = Date.now() ^ (this.handNumber * 9973);
    this.deck = initDeck();
    shuffleDeck(this.deck, seed);
    this.deckPos = 0;
    this.pot = 0;
    this.communityCards = [EMPTY_CARD, EMPTY_CARD, EMPTY_CARD, EMPTY_CARD, EMPTY_CARD];
    this.communityCount = 0;
    this.currentBet = 0;
    this.minRaise = DEMO_BIG_BLIND;
    this.phase = "preFlop";
    this.statusMessage = null;

    const seated = [...this.players.values()].sort((a, b) => a.seat - b.seat);
    for (const p of seated) {
      p.holeCards = [this.deck[this.deckPos], this.deck[this.deckPos + 1]];
      this.deckPos += 2;
      p.status = "active";
      p.roundBet = 0;
      p.totalBet = 0;
      p.hasActed = false;
    }
    this.activeCount = seated.length;
    this.dealerSeat = seated[(this.handNumber - 1) % seated.length].seat;

    const sbSeat = this.nextOccupiedSeat(this.dealerSeat)!;
    const bbSeat = this.nextOccupiedSeat(sbSeat)!;
    this.postBlind(sbSeat, DEMO_SMALL_BLIND);
    this.postBlind(bbSeat, DEMO_BIG_BLIND);
    this.currentBet = DEMO_BIG_BLIND;
    this.minRaise = DEMO_BIG_BLIND;
    this.lastRaiserSeat = bbSeat;

    for (const p of seated) {
      p.hasActed = p.seat !== bbSeat;
    }
    this.setCurrentTurnSeat(this.nextActiveTurnSeat(bbSeat)!);
    return { ok: true };
  }

  /** Server-side timeout — auto-folds the acting player when the move timer expires */
  checkTurnTimeout(): boolean {
    if (!this.isBettingPhase() || !this.turnStartedAt) return false;
    if (Date.now() - this.turnStartedAt < ACTION_TIMER_MS) return false;

    const player = this.playerAtSeat(this.currentTurnSeat);
    if (!player || player.status !== "active") return false;

    player.status = "folded";
    player.hasActed = true;
    this.activeCount--;

    if (this.countContenders() <= 1) {
      this.awardSingleWinner();
      return true;
    }

    this.advanceTurn();
    this.tryAdvanceStreet();
    return true;
  }

  playerAction(
    sessionId: string,
    action: DemoAction
  ): { ok: true } | { ok: false; error: string } {
    const player = this.players.get(sessionId);
    if (!player) return { ok: false, error: "Not seated" };
    if (!["preFlop", "flop", "turn", "river"].includes(this.phase)) {
      return { ok: false, error: "No active hand" };
    }
    if (player.seat !== this.currentTurnSeat) return { ok: false, error: "Not your turn" };
    if (player.status !== "active") return { ok: false, error: "Cannot act" };

    switch (action.type) {
      case "fold":
        player.status = "folded";
        player.hasActed = true;
        this.activeCount--;
        break;
      case "check":
        if (player.roundBet < this.currentBet) {
          return { ok: false, error: "Cannot check — must call or fold" };
        }
        player.hasActed = true;
        break;
      case "call": {
        const toCall = this.currentBet - player.roundBet;
        const actual = Math.min(toCall, player.stack);
        this.deductBet(player, actual);
        if (player.stack === 0) player.status = "allIn";
        player.hasActed = true;
        break;
      }
      case "raise": {
        const toCall = this.currentBet - player.roundBet;
        const total = toCall + action.amount;
        if (action.amount < this.minRaise) {
          return { ok: false, error: `Min raise is ${this.minRaise}` };
        }
        if (total > player.stack) return { ok: false, error: "Insufficient stack" };
        this.deductBet(player, total);
        this.currentBet = player.roundBet;
        this.minRaise = action.amount;
        this.lastRaiserSeat = player.seat;
        if (player.stack === 0) player.status = "allIn";
        player.hasActed = true;
        for (const p of this.players.values()) {
          if (p.seat !== player.seat && p.status === "active") p.hasActed = false;
        }
        break;
      }
    }

    if (this.countContenders() <= 1) {
      this.awardSingleWinner();
      return { ok: true };
    }

    this.advanceTurn();
    this.tryAdvanceStreet();
    return { ok: true };
  }

  private deductBet(player: DemoPlayer, amount: number): void {
    const actual = Math.min(amount, player.stack);
    player.stack -= actual;
    player.roundBet += actual;
    player.totalBet += actual;
    this.pot += actual;
  }

  private postBlind(seat: number, amount: number): void {
    const p = this.playerAtSeat(seat);
    if (!p) return;
    const actual = Math.min(amount, p.stack);
    this.deductBet(p, actual);
    if (p.stack === 0) p.status = "allIn";
  }

  private playerAtSeat(seat: number): DemoPlayer | undefined {
    const sid = this.seatToSession[seat];
    return sid ? this.players.get(sid) : undefined;
  }

  private nextOccupiedSeat(from: number): number | null {
    for (let i = 1; i <= DEMO_MAX_PLAYERS; i++) {
      const seat = (from + i) % DEMO_MAX_PLAYERS;
      if (this.seatToSession[seat]) return seat;
    }
    return null;
  }

  private nextActiveTurnSeat(from: number): number | null {
    for (let i = 1; i <= DEMO_MAX_PLAYERS; i++) {
      const seat = (from + i) % DEMO_MAX_PLAYERS;
      const p = this.playerAtSeat(seat);
      if (p?.status === "active") return seat;
    }
    return null;
  }

  private countContenders(): number {
    let n = 0;
    for (const p of this.players.values()) {
      if (p.status === "active" || p.status === "allIn") n++;
    }
    return n;
  }

  private isBettingPhase(): boolean {
    return ["preFlop", "flop", "turn", "river"].includes(this.phase);
  }

  private setCurrentTurnSeat(seat: number): void {
    this.currentTurnSeat = seat;
    this.turnStartedAt = this.isBettingPhase() ? Date.now() : 0;
  }

  private advanceTurn(): void {
    const next = this.nextActiveTurnSeat(this.currentTurnSeat);
    if (next !== null) this.setCurrentTurnSeat(next);
  }

  private bettingRoundComplete(): boolean {
    const contenders = [...this.players.values()].filter(
      (p) => p.status === "active" || p.status === "allIn"
    );
    if (contenders.length <= 1) return true;

    for (const p of this.players.values()) {
      if (p.status === "active") {
        if (p.roundBet < this.currentBet || !p.hasActed) return false;
      }
    }
    return true;
  }

  private tryAdvanceStreet(): void {
    if (!this.bettingRoundComplete()) return;

    if (this.phase === "river") {
      this.runShowdown();
      return;
    }

    this.currentBet = 0;
    this.minRaise = DEMO_BIG_BLIND;
    for (const p of this.players.values()) {
      if (p.status === "active" || p.status === "allIn") {
        p.hasActed = false;
        p.roundBet = 0;
      }
    }

    if (this.phase === "preFlop") {
      this.phase = "flop";
      this.dealCommunity(3);
    } else if (this.phase === "flop") {
      this.phase = "turn";
      this.dealCommunity(1);
    } else if (this.phase === "turn") {
      this.phase = "river";
      this.dealCommunity(1);
    }

    this.setCurrentTurnSeat(this.nextActiveTurnSeat(this.dealerSeat) ?? this.dealerSeat);
  }

  private dealCommunity(count: number): void {
    for (let i = 0; i < count; i++) {
      this.communityCards[this.communityCount] = this.deck[this.deckPos];
      this.communityCount++;
      this.deckPos++;
    }
  }

  private maybeAwardFoldWin(): void {
    if (this.countContenders() <= 1) this.awardSingleWinner();
  }

  private advanceAfterAction(): void {
    if (this.phase === "waiting") return;
    if (this.countContenders() <= 1) return;
    this.advanceTurn();
    this.tryAdvanceStreet();
  }

  private awardSingleWinner(): void {
    const winner = [...this.players.values()].find(
      (p) => p.status === "active" || p.status === "allIn"
    );
    if (winner) {
      winner.stack += this.pot;
      this.statusMessage = `${winner.username} wins ${this.pot} play chips`;
    }
    this.finishHand();
  }

  private runShowdown(): void {
    const community = this.communityCards.slice(0, this.communityCount);
    const contenders = [...this.players.values()].filter(
      (p) => p.status === "active" || p.status === "allIn"
    );

    if (contenders.length === 0) {
      this.finishHand();
      return;
    }

    if (contenders.length === 1) {
      contenders[0].stack += this.pot;
      this.statusMessage = `${contenders[0].username} wins ${this.pot} play chips`;
      this.finishHand();
      return;
    }

    let best = evaluateHand(contenders[0].holeCards, community);
    let winners: DemoPlayer[] = [contenders[0]];
    for (let i = 1; i < contenders.length; i++) {
      const p = contenders[i];
      const rank = evaluateHand(p.holeCards, community);
      const cmp = compareHands(rank, best);
      if (cmp > 0) {
        best = rank;
        winners = [p];
      } else if (cmp === 0) {
        winners.push(p);
      }
    }

    const share = Math.floor(this.pot / winners.length);
    const remainder = this.pot % winners.length;
    winners.forEach((w, i) => {
      w.stack += share + (i === 0 ? remainder : 0);
    });
    this.statusMessage =
      winners.length === 1
        ? `${winners[0].username} wins ${this.pot} play chips`
        : `Split pot — ${winners.map((w) => w.username).join(", ")}`;
    this.beginShowdown();
  }

  /** Reveal cards briefly before clearing the table */
  private beginShowdown(): void {
    this.clearShowdownTimer();
    this.phase = "showdown";
    this.emitStateChange();
    this.showdownTimer = setTimeout(() => {
      this.showdownTimer = null;
      this.finishHand();
      this.emitStateChange();
    }, 3500);
  }

  private finishHand(): void {
    this.clearShowdownTimer();
    this.turnStartedAt = 0;
    this.pot = 0;
    this.phase = "waiting";
    this.communityCount = 0;
    this.communityCards = [EMPTY_CARD, EMPTY_CARD, EMPTY_CARD, EMPTY_CARD, EMPTY_CARD];
    this.currentBet = 0;

    for (const p of this.players.values()) {
      p.roundBet = 0;
      p.totalBet = 0;
      p.holeCards = [EMPTY_CARD, EMPTY_CARD];
      p.status = "waiting";
      p.hasActed = false;
    }
  }

  getView(forSessionId?: string): DemoRoomView {
    const showAllCards = this.phase === "showdown";
    const players: DemoRoomView["players"] = [...this.players.values()]
      .sort((a, b) => a.seat - b.seat)
      .map((p) => {
        const hideCards =
          !showAllCards && p.sessionId !== forSessionId && p.status !== "folded";
        return {
          sessionId: p.sessionId,
          username: p.username,
          seat: p.seat,
          stack: p.stack,
          roundBet: p.roundBet,
          totalBet: p.totalBet,
          holeCards: hideCards
            ? [EMPTY_CARD, EMPTY_CARD]
            : p.holeCards,
          status: p.status,
          hasActed: p.hasActed,
        };
      });

    return {
      roomId: this.roomId,
      phase: this.phase,
      pot: this.pot,
      communityCards: [...this.communityCards],
      communityCount: this.communityCount,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      dealerSeat: this.dealerSeat,
      currentTurnSeat: this.currentTurnSeat,
      turnStartedAt: this.turnStartedAt,
      buyIn: DEMO_BUY_IN,
      seats: [...this.seatToSession],
      players,
      spectators: [...this.spectators.values()].map((s) => ({
        sessionId: s.sessionId,
        username: s.username,
      })),
      playerCount: this.players.size,
      statusMessage: this.statusMessage,
      handNumber: this.handNumber,
    };
  }

  toSnapshot(): DemoRoomSnapshot {
    return {
      phase: this.phase,
      pot: this.pot,
      communityCards: [...this.communityCards],
      communityCount: this.communityCount,
      currentBet: this.currentBet,
      minRaise: this.minRaise,
      dealerSeat: this.dealerSeat,
      currentTurnSeat: this.currentTurnSeat,
      turnStartedAt: this.turnStartedAt,
      lastRaiserSeat: this.lastRaiserSeat,
      activeCount: this.activeCount,
      deck: [...this.deck],
      deckPos: this.deckPos,
      handNumber: this.handNumber,
      statusMessage: this.statusMessage,
      players: [...this.players.values()],
      spectators: [...this.spectators.values()],
      seatToSession: [...this.seatToSession],
    };
  }

  restoreFromSnapshot(s: DemoRoomSnapshot): void {
    this.clearShowdownTimer();
    this.phase = s.phase;
    this.pot = s.pot;
    this.communityCards = [...s.communityCards];
    this.communityCount = s.communityCount;
    this.currentBet = s.currentBet;
    this.minRaise = s.minRaise;
    this.dealerSeat = s.dealerSeat;
    this.currentTurnSeat = s.currentTurnSeat;
    this.turnStartedAt = s.turnStartedAt;
    this.lastRaiserSeat = s.lastRaiserSeat;
    this.activeCount = s.activeCount;
    this.deck = [...s.deck];
    this.deckPos = s.deckPos;
    this.handNumber = s.handNumber;
    this.statusMessage = s.statusMessage;
    this.players = new Map(s.players.map((p) => [p.sessionId, p]));
    this.spectators = new Map(s.spectators.map((x) => [x.sessionId, x]));
    this.seatToSession = [...s.seatToSession];
    this.stateListeners = new Set();
  }

  static fromSnapshot(s: DemoRoomSnapshot): DemoRoomEngine {
    const room = new DemoRoomEngine();
    room.restoreFromSnapshot(s);
    return room;
  }
}

export interface DemoRoomSnapshot {
  phase: GamePhase;
  pot: number;
  communityCards: number[];
  communityCount: number;
  currentBet: number;
  minRaise: number;
  dealerSeat: number;
  currentTurnSeat: number;
  turnStartedAt: number;
  lastRaiserSeat: number;
  activeCount: number;
  deck: number[];
  deckPos: number;
  handNumber: number;
  statusMessage: string | null;
  players: DemoPlayer[];
  spectators: DemoSpectator[];
  seatToSession: (string | null)[];
}

/** Local singleton — dev / single-process socket server without Redis */
const globalStore = globalThis as unknown as { __demoRoom?: DemoRoomEngine };

if (!globalStore.__demoRoom) {
  globalStore.__demoRoom = new DemoRoomEngine();
}

export const demoRoom = globalStore.__demoRoom;
