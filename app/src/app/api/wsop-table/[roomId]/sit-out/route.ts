import { NextResponse } from "next/server";
import { handleChipRoomSitOut } from "@/lib/chip-room/handlers";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { roomId } = await params;
  const body = await req.json();
  const result = await handleChipRoomSitOut(
    roomId,
    body.sessionId ?? "",
    Boolean(body.sitOut)
  );
  return NextResponse.json(result, { status: result.status });
}
