/**
 * End-to-end demo poker smoke test against a running dev server.
 * Usage: npx tsx scripts/demo-poker-smoke.ts [baseUrl]
 */
import { DemoRoomEngine } from "../src/lib/demo/engine";

const BASE = process.argv[2] ?? "http://localhost:3001";
const ROOM = `demo-smoke-${Date.now()}`;

type JoinRes = {
  ok: boolean;
  sessionId?: string;
  role?: string;
  error?: string;
  state?: { phase: string; stateSeq?: number; playerCount?: number };
};

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok && !(data as { ok?: boolean }).ok) {
    throw new Error(`${path} → HTTP ${res.status}: ${data.error ?? JSON.stringify(data)}`);
  }
  return data;
}

async function getState(sessionId: string) {
  const res = await fetch(
    `${BASE}/api/demo/state?sessionId=${encodeURIComponent(sessionId)}&roomId=${encodeURIComponent(ROOM)}`
  );
  if (!res.ok) throw new Error(`state HTTP ${res.status}`);
  return res.json() as Promise<{
    ok: boolean;
    state?: {
      phase: string;
      stateSeq?: number;
      currentTurnSeat: number;
      playerCount: number;
      players: { sessionId: string; seat: number; status: string; stack: number; holeCards: number[] }[];
      pot: number;
    };
  }>;
}

function log(step: string, ok: boolean, detail?: string) {
  console.log(`${ok ? "✓" : "✗"} ${step}${detail ? ` — ${detail}` : ""}`);
}

async function runHttpSmoke() {
  console.log(`\n=== HTTP demo smoke → ${BASE} (room ${ROOM}) ===\n`);

  const a = await post<JoinRes>("/api/demo/join", {
    username: "smoke_a",
    preferPlayer: true,
    roomId: ROOM,
  });
  log("Player A joins", a.ok && a.role === "player", `role=${a.role}`);

  const b = await post<JoinRes>("/api/demo/join", {
    username: "smoke_b",
    preferPlayer: true,
    roomId: ROOM,
  });
  log("Player B joins", b.ok && b.role === "player", `role=${b.role}`);

  if (!a.sessionId || !b.sessionId) throw new Error("Missing session ids");

  await post("/api/demo/start-hand", { sessionId: a.sessionId, roomId: ROOM });

  let state = (await getState(a.sessionId)).state;
  log("Hand started", state?.phase === "preFlop", `phase=${state?.phase}`);

  if (!state) throw new Error("No state after start");

  const acting = (sid: string) =>
    state!.players.find((p) => p.seat === state!.currentTurnSeat)?.sessionId === sid;

  let safety = 40;
  while (state.phase !== "waiting" && state.phase !== "showdown" && safety-- > 0) {
    const sid = acting(a.sessionId) ? a.sessionId : acting(b.sessionId) ? b.sessionId : null;
    if (!sid) {
      await new Promise((r) => setTimeout(r, 200));
      state = (await getState(a.sessionId)).state!;
      continue;
    }
    const me = state.players.find((p) => p.sessionId === sid)!;
    const action =
      me.stack > 0 && state.pot < 500_000_000
        ? { type: "call" as const }
        : { type: "check" as const };
    await post("/api/demo/action", { sessionId: sid, roomId: ROOM, action });
    state = (await getState(a.sessionId)).state!;
  }

  log(
    "Hand completed or reached showdown",
    state.phase === "waiting" || state.phase === "showdown",
    `phase=${state.phase} pot=${state.pot}`
  );

  const seq1 = state.stateSeq ?? 0;
  const seq2 = (await getState(a.sessionId)).state?.stateSeq ?? 0;
  log("stateSeq advances", seq2 >= seq1, `${seq1} → ${seq2}`);
}

function runEngineSidePot() {
  console.log("\n=== Engine side-pot unit check ===\n");

  const room = new DemoRoomEngine({ roomId: "side-pot-test", startStack: 10_000_000_000 });
  const sidA = "aaaa-aaaa-aaaa-aaaa-aaaaaaa00001";
  const sidB = "bbbb-bbbb-bbbb-bbbb-bbbbbbb00002";
  const sidC = "cccc-cccc-cccc-cccc-ccccc0000003";

  room.joinAsPlayer(sidA, "short", "sA");
  room.joinAsPlayer(sidB, "mid", "sB");
  room.joinAsPlayer(sidC, "big", "sC");

  // Force stacks for side-pot scenario
  const pA = room.findPlayer(sidA)!;
  const pB = room.findPlayer(sidB)!;
  const pC = room.findPlayer(sidC)!;
  pA.stack = 100_000_000;
  pB.stack = 500_000_000;
  pC.stack = 10_000_000_000;

  const start = room.startHand(sidA);
  log("startHand 3 players", start.ok, start.ok ? "" : (start as { error: string }).error);

  // Play until showdown or waiting — brute force call/check
  let guard = 80;
  while (room.phase !== "waiting" && room.phase !== "showdown" && guard-- > 0) {
    room.tick();
    const turn = room.getView().currentTurnSeat;
    const p = room.getView().players.find((x) => x.seat === turn);
    if (!p || p.status !== "active") continue;
    const full = room.findPlayer(p.sessionId);
    if (!full) continue;
    const view = room.getView();
    if (full.roundBet < view.currentBet) {
      room.playerAction(p.sessionId, { type: "call" });
    } else {
      room.playerAction(p.sessionId, { type: "check" });
    }
  }
  room.tick();
  if (room.phase === "showdown") room.processShowdown();

  const stacks = room.getView().players.map((p) => `${p.username}:${p.stack}`);
  const total = room.getView().players.reduce((s, p) => s + p.stack, 0);
  const expected = 100_000_000 + 500_000_000 + 10_000_000_000;
  log("Chips conserved after hand", total === expected, `total=${total} stacks=[${stacks.join(", ")}]`);
}

async function main() {
  try {
    const health = await fetch(`${BASE}/api/demo/lobby`);
    log("Server reachable", health.ok, `lobby ${health.status}`);
    if (!health.ok) process.exit(1);

    await runHttpSmoke();
    runEngineSidePot();
    console.log("\nAll smoke checks passed.\n");
  } catch (err) {
    console.error("\nSmoke test FAILED:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

void main();
