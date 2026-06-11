import { NextResponse } from "next/server";
import { handleChipRoomJoin } from "@/lib/chip-room/handlers";
import { DEMO_START_STACK } from "@/lib/demo/constants";
import { ensurePracticeBots } from "@/lib/practice/bots";
import { practiceRoomId } from "@/lib/practice/store";

export async function POST(req: Request) {
  const body = await req.json();
  const userKey = (body.userKey as string | undefined)?.trim();
  if (!userKey) {
    return NextResponse.json({ ok: false, error: "Profile required" }, { status: 400 });
  }

  const roomId = practiceRoomId(userKey);
  const result = await handleChipRoomJoin(roomId, {
    ...body,
    startStack: DEMO_START_STACK,
    onJoined: (room, _sessionId, role) => {
      room.repairLobbyState();
      if (role === "player") ensurePracticeBots(room);
    },
  });

  return NextResponse.json(result, { status: result.status });
}
