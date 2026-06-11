import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const normalized = handle.replace(/^@/, "").toLowerCase();

  const user = await prisma.user.findFirst({
    where: {
      twitterHandle: normalized,
    },
    select: {
      walletAddress: true,
      twitterHandle: true,
      name: true,
      image: true,
    },
  });

  if (!user?.walletAddress) {
    return NextResponse.json(
      { error: "No wallet linked for this Twitter handle" },
      { status: 404 }
    );
  }

  return NextResponse.json({ user });
}
