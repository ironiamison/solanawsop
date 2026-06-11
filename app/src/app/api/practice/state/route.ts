import { NextResponse } from "next/server";
import { lobbyStatsFrom } from "@/lib/chip-room/handlers";
import { processBotTurns } from "@/lib/practice/bots";
import { practiceRoomId, withPracticeRoom } from "@/lib/practice/store";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userKey = searchParams.get("userKey");
  const sessionId = searchParams.get("sessionId") ?? undefined;
  if (!userKey) {
    return NextResponse.json({ ok: false, error: "Missing userKey" }, { status: 400 });
  }

  const result = await withPracticeRoom(userKey, (room) => {
    if (sessionId && !room.hasSession(sessionId)) {
      return { ok: false as const, error: "Session not found", status: 404 };
    }
    processBotTurns(room);
    return {
      ok: true as const,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: 200,
    };
  });

  return NextResponse.json(result, { status: result.status });
}
