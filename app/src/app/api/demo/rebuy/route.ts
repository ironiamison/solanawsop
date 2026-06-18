import { NextResponse } from "next/server";
import { handleDemoRebuy } from "@/lib/demo/http-handlers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const result = await handleDemoRebuy(
    (body.sessionId as string) || "",
    body.roomId as string | undefined
  );
  return NextResponse.json(result, { status: result.status });
}
