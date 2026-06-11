import { NextResponse } from "next/server";
import { handleDemoAction } from "@/lib/demo/http-handlers";
import type { DemoAction } from "@/lib/demo/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const result = await handleDemoAction(
    (body.sessionId as string) || "",
    body.action as DemoAction | undefined
  );
  return NextResponse.json(result, { status: result.status });
}
