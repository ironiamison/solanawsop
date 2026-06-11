import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateFlywheelMetrics, parseBurnSignatures } from "@/lib/flywheel";

export async function GET() {
  const metrics = await getOrCreateFlywheelMetrics();
  const [handsPlayed, playerCount, pendingRedemptions] = await Promise.all([
    prisma.user.aggregate({ _sum: { handsPlayed: true } }),
    prisma.user.count({ where: { handsPlayed: { gt: 0 } } }),
    prisma.otcRedemption.count({ where: { status: "pending" } }),
  ]);

  return NextResponse.json({
    totalBurnedRaw: metrics.totalBurnedRaw.toString(),
    totalOtcPaidRaw: metrics.totalOtcPaidRaw.toString(),
    creatorRewardsRaw: metrics.creatorRewardsRaw.toString(),
    burnTxSignatures: parseBurnSignatures(metrics.burnTxSignatures),
    handsPlayed: handsPlayed._sum.handsPlayed ?? 0,
    playersWithHands: playerCount,
    pendingRedemptions,
    updatedAt: metrics.updatedAt.toISOString(),
  });
}
