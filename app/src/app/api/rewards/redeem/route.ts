import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";
import {
  REDEMPTION_TIERS,
  redeemRewardPoints,
  type RedemptionTierId,
} from "@/lib/rewards";

export async function GET(req: Request) {
  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  if (!privyUser) {
    return NextResponse.json({ tiers: REDEMPTION_TIERS, redemptions: [] });
  }

  const dbUser = await prisma.user.findUnique({
    where: { privyUserId: privyUser.id },
    select: { id: true, rewardPoints: true },
  });

  if (!dbUser) {
    return NextResponse.json({ tiers: REDEMPTION_TIERS, redemptions: [] });
  }

  const redemptions = await prisma.pointRedemption.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    tiers: REDEMPTION_TIERS,
    rewardPoints: dbUser.rewardPoints,
    redemptions,
  });
}

export async function POST(req: Request) {
  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  if (!privyUser) {
    return NextResponse.json({ error: "Sign in to redeem" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { privyUserId: privyUser.id },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "Profile not synced" }, { status: 400 });
  }

  const body = await req.json();
  const { tierId } = body as { tierId?: RedemptionTierId };
  if (!tierId) {
    return NextResponse.json({ error: "Missing tier" }, { status: 400 });
  }

  const result = await redeemRewardPoints(dbUser.id, tierId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: dbUser.id },
    select: { rewardPoints: true },
  });

  return NextResponse.json({
    redemption: result.redemption,
    rewardPoints: user?.rewardPoints ?? 0,
  });
}
