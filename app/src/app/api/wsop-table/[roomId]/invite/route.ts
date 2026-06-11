import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { verifyPrivyToken } from "@/lib/privy-server";
import { addWsopInvite, getWsopTable } from "@/lib/wsop-private/tables";

type Params = { params: Promise<{ roomId: string }> };

export async function POST(req: Request, { params }: Params) {
  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  if (!privyUser) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const { roomId } = await params;
  const body = await req.json();
  const table = await getWsopTable(roomId);
  if (!table) {
    return NextResponse.json({ error: "Table not found" }, { status: 404 });
  }

  let wallet = (body.inviteeWallet as string | undefined)?.trim() ?? "";
  if (wallet.startsWith("@")) {
    const { prisma } = await import("@/lib/db");
    const user = await prisma.user.findFirst({
      where: { twitterHandle: wallet.slice(1) },
      select: { walletAddress: true },
    });
    if (!user?.walletAddress) {
      return NextResponse.json({ error: "No wallet for that handle" }, { status: 404 });
    }
    wallet = user.walletAddress;
  }

  try {
    new PublicKey(wallet);
  } catch {
    return NextResponse.json({ error: "Invalid wallet" }, { status: 400 });
  }

  await addWsopInvite(roomId, wallet);
  return NextResponse.json({ ok: true, inviteeWallet: wallet });
}
