import type { GamePhase, PlayerStatus } from "@/lib/types";
import {
  ACTION_TIMER_MS,
  consumeTimeBank,
  TIME_BANK_MS,
} from "@/lib/game/turnTimer";
import { formatTokens } from "@/lib/constants";
import {
  AUTO_DEAL_DELAY_MS,
  DEMO_BIG_BLIND,
  DEMO_BUY_IN,
  DEMO_MAX_PLAYERS,
  DEMO_ROOM_ID,
  DEMO_SMALL_BLIND,
  DEMO_START_STACK,
  SHOWDOWN_DELAY_MS,
} from "./constants";
import { compareHands, evaluateHand } from "./handEval";
import type {
  DemoAction,
  DemoHandWin,
  DemoPlayer,
  DemoRoomView,
  DemoSpectator,
} from "./types";

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

export interface DemoRoomOptions {
  roomId?: string;
  startStack?: number;
}

export class DemoRoomEngine {
  readonly roomId: string;
  readonly startStack: number;
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
  lastHandWin: DemoHandWin | null = null;
  autoDealAt: number | null = null;
  /** Wall-clock end of showdown reveal — persisted so serverless ticks can finish the hand */
  showdownEndsAt: number | null = null;

  private showdownTimer: ReturnType<typeof setTimeout> | null = null;
  private stateListeners = new Set<() => void>();
  private players = new Map<string, DemoPlayer>();
  private spectators = new Map<string, DemoSpectator>();
  private seatToSession: (string | null)[] = Array(DEMO_MAX_PLAYERS).fill(null);

  constructor(opts?: DemoRoomOptions) {
    this.roomId = opts?.roomId ?? DEMO_ROOM_ID;
    this.startStack = opts?.startStack ?? DEMO_START_STACK;
  }

  private scaledBlind(multiple: number): number {
    const ratio = this.startStack / DEMO_START_STACK;
    return Math.max(1, Math.floor(multiple * ratio));
  }

  private smallBlindAmount(): number {
    return this.scaledBlind(DEMO_SMALL_BLIND);
  }

  private bigBlindAmount(): number {
    return this.scaledBlind(DEMO_BIG_BLIND);
  }

  onStateChange(listener: () => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  private emitStateChange(): void {
    for (const listener of this.stateListeners) listener();
  }

  private clearShowdownTimer(): void {
    this.showdownEndsAt = null;
    if (this.showdownTimer) {
      clearTimeout(this.showdownTimer);
      this.showdownTimer = null;
    }
  }

  private formatPot(pot: number): string {
    return `${formatTokens(pot)} play chips`;
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

  /**
   * Re-attach a seat when the browser lost its session id (cleared storage, new tab)
   * but the same username is still seated at the table.
   */
  reclaimSeatForUsername(
    newSessionId: string,
    username: string
  ): "player" | "spectator" | null {
    if (this.hasSession(newSessionId)) return null;
    const lower = username.toLowerCase();

    for (const [oldSid, player] of this.players.entries()) {
      if (oldSid === newSessionId || player.username.toLowerCase() !== lower) {
        continue;
      }
      this.transferPlayerSession(oldSid, newSessionId);
      return "player";
    }

    for (const [oldSid, spec] of this.spectators.entries()) {
      if (oldSid === newSessionId || spec.username.toLowerCase() !== lower) {
        continue;
      }
      this.spectators.delete(oldSid);
      this.spectators.set(newSessionId, {
        sessionId: newSessionId,
        username: spec.username,
        socketId: spec.socketId,
      });
      return "spectator";
    }

    return null;
  }

  private transferPlayerSession(oldSessionId: string, newSessionId: string): void {
    const player = this.players.get(oldSessionId);
    if (!player) return;
    this.players.delete(oldSessionId);
    player.sessionId = newSessionId;
    this.players.set(newSessionId, player);
    const seatIdx = this.seatToSession.findIndex((s) => s === oldSessionId);
    if (seatIdx >= 0) this.seatToSession[seatIdx] = newSessionId;
    this.reconcileSeats();
  }

  /** Seat a bot player at a fixed seat (practice tables only) */
  addBotPlayer(seat: number, sessionId: string, username: string): void {
    if (this.phase !== "waiting" || this.seatToSession[seat]) return;
    const player: DemoPlayer = {
      sessionId,
      username,
      socketId: `bot-${seat}`,
      seat,
      stack: this.startStack,
      roundBet: 0,
      totalBet: 0,
      holeCards: [EMPTY_CARD, EMPTY_CARD],
      status: "waiting",
      hasActed: false,
      timeBankMs: TIME_BANK_MS,
      sitOutNextHand: false,
    };
    this.players.set(sessionId, player);
    this.seatToSession[seat] = sessionId;
    this.reconcileSeats();
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
      this.maybeScheduleAutoDeal();
      return { ok: true };
    }
    const seat = this.seatToSession.findIndex((s) => s === null);
    if (seat < 0) return { ok: false, error: "No open seats" };

    const player: DemoPlayer = {
      sessionId,
      username,
      socketId,
      seat,
      stack: this.startStack,
      roundBet: 0,
      totalBet: 0,
      holeCards: [EMPTY_CARD, EMPTY_CARD],
      status: "waiting",
      hasActed: false,
      timeBankMs: TIME_BANK_MS,
      sitOutNextHand: false,
    };
    this.players.set(sessionId, player);
    this.seatToSession[seat] = sessionId;
    this.reconcileSeats();
    this.maybeScheduleAutoDeal();
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
    this.maybeScheduleAutoDeal();
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

  /** Players eligible for the next deal (seated, not sitting out, have chips) */
  private readyToPlayPlayers(): DemoPlayer[] {
    return [...this.players.values()]
      .filter((p) => !p.sitOutNextHand && p.stack > 0)
      .sort((a, b) => a.seat - b.seat);
  }

  private nextDealtSeat(from: number): number | null {
    for (let i = 1; i <= DEMO_MAX_PLAYERS; i++) {
      const seat = (from + i) % DEMO_MAX_PLAYERS;
      const p = this.playerAtSeat(seat);
      if (p && !p.sitOutNextHand && p.stack > 0) return seat;
    }
    return null;
  }

  private clearAutoDealSchedule(): void {
    this.autoDealAt = null;
  }

  private scheduleAutoDeal(): void {
    this.autoDealAt = Date.now() + AUTO_DEAL_DELAY_MS;
  }

  scheduleAutoDealIfReady(): void {
    this.maybeScheduleAutoDeal();
  }

  private maybeScheduleAutoDeal(): void {
    if (this.phase !== "waiting") return;
    if (this.readyToPlayPlayers().length < 2) {
      this.clearAutoDealSchedule();
      return;
    }
    if (!this.autoDealAt) this.scheduleAutoDeal();
  }

  removePlayer(sessionId: string): void {
    if (this.phase !== "waiting") return;
    const player = this.players.get(sessionId);
    if (!player) return;
    this.players.delete(sessionId);
    if (this.seatToSession[player.seat] === sessionId) {
      this.seatToSession[player.seat] = null;
    }
  }

  /** Called on each server tick — starts the next hand when the delay elapses */
  processAutoDeal(): boolean {
    if (this.phase !== "waiting" || !this.autoDealAt) return false;
    if (Date.now() < this.autoDealAt) return false;
    this.autoDealAt = null;
    const result = this.startHandInternal();
    if (!result.ok) this.maybeScheduleAutoDeal();
    return result.ok;
  }

  /** Finish showdown after the reveal delay (Redis/serverless-safe — no setTimeout required). */
  processShowdown(): boolean {
    if (this.phase !== "showdown") return false;
    if (!this.showdownEndsAt) {
      this.finishHand();
      return true;
    }
    if (Date.now() < this.showdownEndsAt) return false;
    this.showdownEndsAt = null;
    this.finishHand();
    return true;
  }

  /** Run turn timeouts and scheduled auto-deals */
  tick(): boolean {
    let changed = this.ensureActiveTurn();
    if (this.checkTurnTimeout()) changed = true;
    if (this.tryRunOutBoard()) changed = true;
    if (this.processShowdown()) changed = true;
    if (this.phase === "waiting") {
      const before = this.autoDealAt;
      this.maybeScheduleAutoDeal();
      if (this.autoDealAt !== before) changed = true;
    }
    if (this.processAutoDeal()) changed = true;
    return changed;
  }

  /** Clear stale hand UI state between hands (corrupt snapshots, practice reload). */
  repairLobbyState(): void {
    if (this.phase !== "waiting") return;
    this.pot = 0;
    this.communityCount = 0;
    this.communityCards = [
      EMPTY_CARD,
      EMPTY_CARD,
      EMPTY_CARD,
      EMPTY_CARD,
      EMPTY_CARD,
    ];
    this.currentBet = 0;
    this.minRaise = DEMO_BIG_BLIND;
    this.turnStartedAt = 0;
    this.statusMessage = null;
    this.lastHandWin = null;

    for (const p of this.players.values()) {
      p.roundBet = 0;
      p.totalBet = 0;
      p.holeCards = [EMPTY_CARD, EMPTY_CARD];
      p.status = "waiting";
      p.hasActed = false;
    }

    this.reconcileSeats();
    this.maybeScheduleAutoDeal();
  }

  /** Keep seatToSession aligned with player.seat (safe during active hands). */
  private syncSeatMap(): void {
    const next: (string | null)[] = Array(DEMO_MAX_PLAYERS).fill(null);
    for (const p of this.players.values()) {
      const seat = p.seat;
      if (seat >= 0 && seat < DEMO_MAX_PLAYERS && !next[seat]) {
        next[seat] = p.sessionId;
      }
    }
    this.seatToSession = next;
  }

  /** Fix seat map drift from concurrent joins (Redis races) or bad snapshots. */
  reconcileSeats(): void {
    if (this.phase !== "waiting") {
      this.syncSeatMap();
      return;
    }

    this.seatToSession = Array(DEMO_MAX_PLAYERS).fill(null);
    const sorted = [...this.players.values()].sort((a, b) => a.seat - b.seat);

    for (const p of sorted) {
      let seat = p.seat;
      if (
        seat < 0 ||
        seat >= DEMO_MAX_PLAYERS ||
        this.seatToSession[seat] !== null
      ) {
        const free = this.seatToSession.findIndex((s) => s === null);
        if (free < 0) {
          this.players.delete(p.sessionId);
          continue;
        }
        seat = free;
        p.seat = seat;
      }
      this.seatToSession[seat] = p.sessionId;
    }
  }

  setSitOut(
    sessionId: string,
    sitOut: boolean
  ): { ok: true } | { ok: false; error: string } {
    const player = this.players.get(sessionId);
    if (!player) return { ok: false, error: "Not seated" };
    if (this.phase !== "waiting") {
      return { ok: false, error: "Can only sit out between hands" };
    }
    player.sitOutNextHand = sitOut;
    if (sitOut) {
      this.statusMessage = `${player.username} is sitting out`;
    } else if (this.statusMessage?.includes("sitting out")) {
      this.statusMessage = null;
    }
    this.maybeScheduleAutoDeal();
    return { ok: true };
  }

  toggleSitOut(sessionId: string): { ok: true; sitOut: boolean } | { ok: false; error: string } {
    const player = this.players.get(sessionId);
    if (!player) return { ok: false, error: "Not seated" };
    const result = this.setSitOut(sessionId, !player.sitOutNextHand);
    if (!result.ok) return result;
    return { ok: true, sitOut: player.sitOutNextHand };
  }

  startHand(_requesterId: string): { ok: true } | { ok: false; error: string } {
    return this.startHandInternal();
  }

  private startHandInternal(): { ok: true } | { ok: false; error: string } {
    this.clearShowdownTimer();
    this.clearAutoDealSchedule();
    if (this.phase !== "waiting") return { ok: false, error: "Hand already running" };

    const playing = this.readyToPlayPlayers();
    if (playing.length < 2) {
      return { ok: false, error: "Need at least 2 players not sitting out" };
    }

    this.handNumber++;
    const seed = Date.now() ^ (this.handNumber * 9973);
    this.deck = initDeck();
    shuffleDeck(this.deck, seed);
    this.deckPos = 0;
    this.pot = 0;
    this.communityCards = [EMPTY_CARD, EMPTY_CARD, EMPTY_CARD, EMPTY_CARD, EMPTY_CARD];
    this.communityCount = 0;
    this.currentBet = 0;
    const sb = this.smallBlindAmount();
    const bb = this.bigBlindAmount();
    this.minRaise = bb;
    this.phase = "preFlop";
    this.statusMessage = null;
    this.lastHandWin = null;

    for (const p of this.players.values()) {
      p.roundBet = 0;
      p.totalBet = 0;
      p.hasActed = false;
      if (p.sitOutNextHand || p.stack <= 0) {
        p.status = "waiting";
        p.holeCards = [EMPTY_CARD, EMPTY_CARD];
        continue;
      }
      p.holeCards = [this.deck[this.deckPos], this.deck[this.deckPos + 1]];
      this.deckPos += 2;
      p.status = "active";
    }

    this.activeCount = playing.length;
    this.dealerSeat = playing[(this.handNumber - 1) % playing.length].seat;

    const sbSeat = this.nextDealtSeat(this.dealerSeat)!;
    const bbSeat = this.nextDealtSeat(sbSeat)!;
    this.postBlind(sbSeat, sb);
    this.postBlind(bbSeat, bb);
    this.currentBet = bb;
    this.minRaise = bb;
    this.lastRaiserSeat = bbSeat;

    for (const p of playing) {
      p.hasActed = p.seat !== bbSeat;
    }
    this.setCurrentTurnSeat(this.nextActiveTurnSeat(bbSeat)!);
    return { ok: true };
  }

  private applyTimeBankCost(player: DemoPlayer): void {
    if (!this.turnStartedAt) return;
    player.timeBankMs = consumeTimeBank(this.turnStartedAt, player.timeBankMs);
  }

  /** Skip turn indicator when it points at a folded / all-in seat */
  private ensureActiveTurn(): boolean {
    if (!this.isBettingPhase()) return false;
    const player = this.playerAtSeat(this.currentTurnSeat);
    if (player?.status === "active") return false;
    this.advanceTurn();
    this.tryAdvanceStreet();
    return true;
  }

  /** When everyone left is all-in, deal remaining streets to showdown */
  private tryRunOutBoard(): boolean {
    if (!this.isBettingPhase()) return false;
    const active = [...this.players.values()].filter((p) => p.status === "active");
    if (active.length > 0) return false;
    if (this.countContenders() <= 1) return false;

    while (this.phase !== "river") {
      this.tryAdvanceStreet();
      if (!this.isBettingPhase()) return true;
    }
    if (this.bettingRoundComplete()) {
      this.runShowdown();
      return true;
    }
    return false;
  }

  /** Server-side timeout — auto-check if free, else fold */
  checkTurnTimeout(): boolean {
    if (!this.isBettingPhase() || !this.turnStartedAt) return false;

    const player = this.playerAtSeat(this.currentTurnSeat);
    if (!player || player.status !== "active") return false;
    if (Date.now() - this.turnStartedAt < ACTION_TIMER_MS + player.timeBankMs) {
      return false;
    }

    player.timeBankMs = 0;

    if (player.roundBet >= this.currentBet) {
      player.hasActed = true;
      if (this.countContenders() <= 1) {
        this.awardSingleWinner();
        return true;
      }
      this.advanceTurn();
      this.tryAdvanceStreet();
      this.tryRunOutBoard();
      return true;
    }

    player.status = "folded";
    player.hasActed = true;
    this.activeCount--;

    if (this.countContenders() <= 1) {
      this.awardSingleWinner();
      return true;
    }

    this.advanceTurn();
    this.tryAdvanceStreet();
    this.tryRunOutBoard();
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
    if (player.status === "folded") {
      return { ok: false, error: "You folded this hand" };
    }
    if (player.status === "allIn") {
      return { ok: false, error: "You're all-in — waiting for the board" };
    }
    if (player.status !== "active") return { ok: false, error: "Cannot act" };

    this.applyTimeBankCost(player);

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
    this.tryRunOutBoard();
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
    if (next !== null) {
      this.setCurrentTurnSeat(next);
      return;
    }
    if (this.isBettingPhase()) this.tryAdvanceStreet();
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

  private recordHandWin(winnerSessionIds: string[], pot: number): void {
    this.lastHandWin = {
      handNumber: this.handNumber,
      winnerSessionIds,
      pot,
    };
  }

  private awardSingleWinner(): void {
    const winner = [...this.players.values()].find(
      (p) => p.status === "active" || p.status === "allIn"
    );
    if (winner) {
      const pot = this.pot;
      winner.stack += pot;
      this.recordHandWin([winner.sessionId], pot);
      this.statusMessage = `${winner.username} wins ${this.formatPot(pot)}`;
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
      const pot = this.pot;
      contenders[0].stack += pot;
      this.recordHandWin([contenders[0].sessionId], pot);
      this.statusMessage = `${contenders[0].username} wins ${this.formatPot(pot)}`;
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

    const pot = this.pot;
    const share = Math.floor(pot / winners.length);
    const remainder = pot % winners.length;
    winners.forEach((w, i) => {
      w.stack += share + (i === 0 ? remainder : 0);
    });
    this.recordHandWin(
      winners.map((w) => w.sessionId),
      pot
    );
    this.statusMessage =
      winners.length === 1
        ? `${winners[0].username} wins ${this.formatPot(pot)}`
        : `Split pot — ${winners.map((w) => w.username).join(", ")}`;
    this.beginShowdown();
  }

  /** Reveal cards briefly before clearing the table */
  private beginShowdown(): void {
    this.clearShowdownTimer();
    this.phase = "showdown";
    this.turnStartedAt = 0;
    this.showdownEndsAt = Date.now() + SHOWDOWN_DELAY_MS;
    this.emitStateChange();
    this.showdownTimer = setTimeout(() => {
      this.showdownTimer = null;
      if (this.processShowdown()) this.emitStateChange();
    }, SHOWDOWN_DELAY_MS);
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

    const ready = this.readyToPlayPlayers();
    if (ready.length >= 2) {
      this.maybeScheduleAutoDeal();
    } else {
      this.statusMessage =
        ready.length === 0
          ? "Waiting for players…"
          : "Need 2+ players — others can sit in or take a seat";
    }
  }

  getView(forSessionId?: string): DemoRoomView {
    const showAllCards = this.phase === "showdown";
    const players: DemoRoomView["players"] = [...this.players.values()]
      .sort((a, b) => a.seat - b.seat)
      .map((p) => {
        const hideCards =
          this.phase === "waiting" ||
          (!showAllCards && p.sessionId !== forSessionId && p.status !== "folded");
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
          timeBankMs: p.timeBankMs,
          sitOutNextHand: p.sitOutNextHand,
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
      buyIn: this.startStack,
      seats: [...this.seatToSession],
      players,
      spectators: [...this.spectators.values()].map((s) => ({
        sessionId: s.sessionId,
        username: s.username,
      })),
      playerCount: this.players.size,
      statusMessage: this.statusMessage,
      handNumber: this.handNumber,
      lastHandWin: this.lastHandWin,
      autoDealAt: this.autoDealAt,
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
      lastHandWin: this.lastHandWin,
      autoDealAt: this.autoDealAt,
      showdownEndsAt: this.showdownEndsAt,
      roomId: this.roomId,
      startStack: this.startStack,
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
    this.lastHandWin = s.lastHandWin ?? null;
    this.autoDealAt = s.autoDealAt ?? null;
    this.showdownEndsAt = s.showdownEndsAt ?? null;
    if (this.phase === "showdown" && !this.showdownEndsAt) {
      this.showdownEndsAt = Date.now();
    }
    this.players = new Map(
      s.players.map((p) => [
        p.sessionId,
        {
          ...p,
          timeBankMs: p.timeBankMs ?? TIME_BANK_MS,
          sitOutNextHand: p.sitOutNextHand ?? false,
        },
      ])
    );
    this.spectators = new Map(s.spectators.map((x) => [x.sessionId, x]));
    this.seatToSession = [...s.seatToSession];
    this.stateListeners = new Set();
    this.reconcileSeats();
  }

  static fromSnapshot(s: DemoRoomSnapshot): DemoRoomEngine {
    const room = new DemoRoomEngine({
      roomId: s.roomId,
      startStack: s.startStack,
    });
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
  lastHandWin: DemoHandWin | null;
  autoDealAt: number | null;
  showdownEndsAt?: number | null;
  roomId: string;
  startStack: number;
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
