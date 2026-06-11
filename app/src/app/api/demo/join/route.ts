import { NextResponse } from "next/server";
import { handleDemoJoin } from "@/lib/demo/http-handlers";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const result = await handleDemoJoin(body);
  return NextResponse.json(result, { status: result.status });
}
