import { NextResponse } from "next/server";
import { handleChipRoomAction } from "@/lib/chip-room/handlers";
import type { DemoAction } from "@/lib/demo/types";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { roomId } = await params;
  const body = await req.json();
  const result = await handleChipRoomAction(
    roomId,
    body.sessionId ?? "",
    body.action as DemoAction
  );
  return NextResponse.json(result, { status: result.status });
}
