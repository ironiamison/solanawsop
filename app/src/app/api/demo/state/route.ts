import { NextResponse } from "next/server";
import { handleDemoState } from "@/lib/demo/http-handlers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const sessionId = new URL(req.url).searchParams.get("sessionId") ?? undefined;
  const result = handleDemoState(sessionId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}
