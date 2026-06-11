import { NextResponse } from "next/server";
import { handleChipRoomLeaveSeat } from "@/lib/chip-room/handlers";
import { practiceRoomId } from "@/lib/practice/store";

export async function POST(req: Request) {
  const body = await req.json();
  const userKey = (body.userKey as string | undefined)?.trim();
  if (!userKey) {
    return NextResponse.json({ ok: false, error: "Missing userKey" }, { status: 400 });
  }
  const result = await handleChipRoomLeaveSeat(practiceRoomId(userKey), body.sessionId ?? "");
  return NextResponse.json(result, { status: result.status });
}
