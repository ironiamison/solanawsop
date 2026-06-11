import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const LABELS: Record<string, string> = {
  hand_played: "Played a hand",
  referral_invite: "Invited a friend",
  referral_welcome: "Joined via referral",
  twitter_verified: "Verified Twitter",
  point_redemption: "Redeemed reward points",
};

function displayUser(user: {
  twitterHandle: string | null;
  name: string | null;
  walletAddress: string | null;
}) {
  if (user.twitterHandle) return `@${user.twitterHandle}`;
  if (user.name) return user.name;
  if (user.walletAddress) return `${user.walletAddress.slice(0, 4)}…${user.walletAddress.slice(-4)}`;
  return "Player";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 5, 1), 12);

  try {
    const events = await prisma.rewardEvent.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            twitterHandle: true,
            name: true,
            walletAddress: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({
      events: events.map((event) => ({
        id: event.id,
        user: displayUser(event.user),
        action: LABELS[event.type] ?? "Activity",
        points: event.points,
        amountLabel:
          event.points > 0
            ? `+${event.points.toLocaleString()} pts`
            : `${event.points.toLocaleString()} pts`,
        image: event.user.image,
        createdAt: event.createdAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ events: [] });
  }
}
