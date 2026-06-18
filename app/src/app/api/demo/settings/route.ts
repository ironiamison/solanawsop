import { NextResponse } from "next/server";
import { handleDemoSettings } from "@/lib/demo/http-handlers";
import type { BotDifficulty } from "@/lib/demo/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const result = await handleDemoSettings(
    (body.sessionId as string) || "",
    body.botDifficulty as BotDifficulty | undefined,
    body.roomId as string | undefined
  );
  return NextResponse.json(result, { status: result.status });
}
