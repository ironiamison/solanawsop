import { NextResponse } from "next/server";
import { handleDemoSitOut } from "@/lib/demo/http-handlers";

export async function POST(req: Request) {
  const body = await req.json();
  const result = await handleDemoSitOut(
    body.sessionId ?? "",
    Boolean(body.sitOut)
  );
  return NextResponse.json(result, { status: result.status });
}
