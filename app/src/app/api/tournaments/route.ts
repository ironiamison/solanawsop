import { NextResponse } from "next/server";
import { listTournamentsWithCounts } from "@/lib/tournament-store";

export async function GET() {
  try {
    const tournaments = await listTournamentsWithCounts();
    return NextResponse.json({ ok: true, tournaments });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to load tournaments";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
