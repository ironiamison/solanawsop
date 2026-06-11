import { NextResponse } from "next/server";
import type { DemoAction } from "@/lib/demo/types";
import { lobbyStatsFrom } from "@/lib/chip-room/handlers";
import { processBotTurns } from "@/lib/practice/bots";
import { withPracticeRoom } from "@/lib/practice/store";

export async function POST(req: Request) {
  const body = await req.json();
  const userKey = (body.userKey as string | undefined)?.trim();
  const sessionId = body.sessionId ?? "";
  const action = body.action as DemoAction | undefined;

  if (!userKey) {
    return NextResponse.json({ ok: false, error: "Missing userKey" }, { status: 400 });
  }

  const result = await withPracticeRoom(userKey, (room) => {
    if (!sessionId || !room.hasSession(sessionId)) {
      return { ok: false as const, error: "Not in room", status: 400 };
    }
    if (!action?.type) {
      return { ok: false as const, error: "Invalid action", status: 400 };
    }
    const act = room.playerAction(sessionId, action);
    processBotTurns(room);
    return {
      ...act,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: act.ok ? 200 : 400,
    };
  });

  return NextResponse.json(result, { status: result.status });
}
