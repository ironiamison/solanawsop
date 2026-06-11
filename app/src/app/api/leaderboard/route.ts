import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") === "points" ? "points" : "wins";
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 10, 1), 50);

  const players = await prisma.user.findMany({
    where:
      sort === "points"
        ? { rewardPoints: { gt: 0 } }
        : { handsPlayed: { gt: 0 } },
    orderBy:
      sort === "points"
        ? [{ rewardPoints: "desc" }, { handsWon: "desc" }]
        : [{ handsWon: "desc" }, { handsPlayed: "desc" }],
    take: limit,
    select: {
      id: true,
      walletAddress: true,
      twitterHandle: true,
      name: true,
      image: true,
      handsPlayed: true,
      handsWon: true,
      rewardPoints: true,
    },
  });

  return NextResponse.json({
    sort,
    players: players.map((p, i) => ({
      rank: i + 1,
      id: p.id,
      walletAddress: p.walletAddress,
      twitterHandle: p.twitterHandle,
      name: p.name,
      image: p.image,
      handsPlayed: p.handsPlayed,
      handsWon: p.handsWon,
      rewardPoints: p.rewardPoints,
      winRate:
        p.handsPlayed > 0
          ? Math.round((p.handsWon / p.handsPlayed) * 100)
          : 0,
    })),
  });
}
