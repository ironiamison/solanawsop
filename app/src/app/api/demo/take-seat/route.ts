import { NextResponse } from "next/server";
import { handleDemoTakeSeat } from "@/lib/demo/http-handlers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const result = await handleDemoTakeSeat((body.sessionId as string) || "");
  return NextResponse.json(result, { status: result.status });
}
