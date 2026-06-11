import { NextResponse } from "next/server";
import { handleChipRoomJoin } from "@/lib/chip-room/handlers";
import { canJoinWsopTable, getWsopTable } from "@/lib/wsop-private/tables";
type Params = { params: Promise<{ roomId: string }> };

export async function POST(req: Request, { params }: Params) {
  const { roomId } = await params;
  const body = await req.json();
  const table = await getWsopTable(roomId);
  if (!table) {
    return NextResponse.json({ ok: false, error: "Table not found" }, { status: 404 });
  }

  const gate = await canJoinWsopTable(roomId, body.wallet as string | undefined);
  if (gate !== true) {
    return NextResponse.json({ ok: false, error: gate }, { status: 403 });
  }

  const result = await handleChipRoomJoin(roomId, {
    ...body,
    startStack: Number(table.buyInRaw),
  });

  return NextResponse.json(result, { status: result.status });
}
