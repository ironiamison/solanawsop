import { NextResponse } from "next/server";
import { registerForTournament } from "@/lib/tournament-store";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await req.json()) as {
      walletAddress?: string;
      username?: string;
      privyUserId?: string;
    };
    const result = await registerForTournament({
      tournamentId: id,
      walletAddress: body.walletAddress?.trim() || null,
      username: body.username?.trim() || null,
      privyUserId: body.privyUserId?.trim() || null,
    });
    return NextResponse.json(result, { status: result.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Registration failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
