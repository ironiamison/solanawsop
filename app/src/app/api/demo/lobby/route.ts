import { NextResponse } from "next/server";
import { handleDemoLobby } from "@/lib/demo/http-handlers";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(handleDemoLobby());
}
