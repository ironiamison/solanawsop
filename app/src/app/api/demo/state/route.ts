import { NextResponse } from "next/server";
import { handleDemoState } from "@/lib/demo/http-handlers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get("sessionId") ?? undefined;
  const roomId = url.searchParams.get("roomId") ?? undefined;
  const result = await handleDemoState(sessionId, roomId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
