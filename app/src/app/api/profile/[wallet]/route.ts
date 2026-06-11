import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ wallet: string }> }
) {
  const { wallet } = await params;

  const user = await prisma.user.findUnique({
    where: { walletAddress: wallet },
    select: {
      id: true,
      name: true,
      image: true,
      twitterHandle: true,
      bio: true,
      walletAddress: true,
      handsPlayed: true,
      handsWon: true,
    },
  });

  if (!user) {
    return NextResponse.json({ profile: null });
  }

  return NextResponse.json({ profile: user });
}
