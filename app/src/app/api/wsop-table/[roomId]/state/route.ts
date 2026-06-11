import { NextResponse } from "next/server";
import { handleChipRoomState } from "@/lib/chip-room/handlers";

type Params = { params: Promise<{ roomId: string }> };

export async function GET(req: Request, { params }: Params) {
  const { roomId } = await params;
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId") ?? undefined;
  const result = await handleChipRoomState(roomId, sessionId);
  return NextResponse.json(result, { status: result.status });
}
