import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DemoRoomEngine } from "./engine";
import { compareHands, evaluateHand } from "./handEval";
import { visualSeat } from "@/components/game/seatCoords";

describe("demo engine", () => {
  it("starts a hand with two seated players", () => {
    const room = new DemoRoomEngine({ roomId: "test-2p", startStack: 1_000_000_000 });
    room.joinAsPlayer("s1", "alice", "sock1");
    room.joinAsPlayer("s2", "bob", "sock2");
    const res = room.startHand("s1");
    assert.equal(res.ok, true);
    assert.equal(room.getView().phase, "preFlop");
    assert.equal(room.getView().playerCount, 2);
  });

  it("conserves chips through a short all-in side pot", () => {
    const room = new DemoRoomEngine({ roomId: "side-pot", startStack: 10_000_000_000 });
    const sidA = "aaaa-aaaa-aaaa-aaaa-aaaaaaa00001";
    const sidB = "bbbb-bbbb-bbbb-bbbb-bbbbbbb00002";
    const sidC = "cccc-cccc-cccc-cccc-ccccc0000003";

    room.joinAsPlayer(sidA, "short", "sA");
    room.joinAsPlayer(sidB, "mid", "sB");
    room.joinAsPlayer(sidC, "big", "sC");

    room.findPlayer(sidA)!.stack = 100_000_000;
    room.findPlayer(sidB)!.stack = 500_000_000;
    room.findPlayer(sidC)!.stack = 10_000_000_000;

    assert.equal(room.startHand(sidA).ok, true);

    let guard = 80;
    while (room.phase !== "waiting" && room.phase !== "showdown" && guard-- > 0) {
      room.tick();
      const view = room.getView();
      const turn = view.players.find((p) => p.seat === view.currentTurnSeat);
      if (!turn || turn.status !== "active") continue;
      const full = room.findPlayer(turn.sessionId);
      if (!full) continue;
      if (full.roundBet < view.currentBet) {
        room.playerAction(turn.sessionId, { type: "call" });
      } else {
        room.playerAction(turn.sessionId, { type: "check" });
      }
    }
    room.tick();
    if (room.phase === "showdown") room.processShowdown();

    const total = room.getView().players.reduce((s, p) => s + p.stack, 0);
    assert.equal(total, 100_000_000 + 500_000_000 + 10_000_000_000);
  });

  it("rejects seat join mid-hand", () => {
    const room = new DemoRoomEngine({ roomId: "mid-hand", startStack: 1_000_000_000 });
    room.joinAsPlayer("s1", "alice", "sock1");
    room.joinAsPlayer("s2", "bob", "sock2");
    room.startHand("s1");
    const join = room.joinAsPlayer("s3", "carol", "sock3");
    assert.equal(join.ok, false);
  });
});

describe("hand eval", () => {
  it("ranks pair above high card", () => {
    const pair = evaluateHand([12, 25], [1, 3, 5, 7, 9]);
    const high = evaluateHand([0, 4], [1, 3, 6, 8, 10]);
    assert.ok(compareHands(pair, high) > 0);
  });
});

describe("seat layout", () => {
  it("rotates hero to visual seat 0", () => {
    assert.equal(visualSeat(3, 3), 0);
    assert.equal(visualSeat(0, 3), 3);
  });
});
