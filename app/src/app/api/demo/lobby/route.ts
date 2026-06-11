import { NextResponse } from "next/server";
import { lobbyStats } from "@/lib/demo/socket";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(lobbyStats());
}
