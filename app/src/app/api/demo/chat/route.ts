import { NextResponse } from "next/server";
import { handleDemoChatList, handleDemoChatSend } from "@/lib/demo/http-handlers";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const since = Number(new URL(req.url).searchParams.get("since") ?? "0");
  const result = await handleDemoChatList(Number.isFinite(since) ? since : 0);
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const result = await handleDemoChatSend(body);
  return NextResponse.json(result, { status: result.status });
}
