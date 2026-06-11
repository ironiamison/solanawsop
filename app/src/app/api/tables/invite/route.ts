import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";

export async function POST(req: Request) {
  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  if (!privyUser) {
    return NextResponse.json({ error: "Sign in to invite players" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { privyUserId: privyUser.id },
  });
  if (!dbUser) {
    return NextResponse.json({ error: "Profile not synced" }, { status: 400 });
  }

  const body = await req.json();
  const { roomPubkey, inviteeWallet, inviteeTwitter } = body as {
    roomPubkey: string;
    inviteeWallet?: string;
    inviteeTwitter?: string;
  };

  if (!roomPubkey || (!inviteeWallet && !inviteeTwitter)) {
    return NextResponse.json({ error: "Missing invite target" }, { status: 400 });
  }

  const invite = await prisma.tableInvite.create({
    data: {
      roomPubkey,
      inviterId: dbUser.id,
      inviteeWallet: inviteeWallet ?? null,
      inviteeTwitter: inviteeTwitter?.replace(/^@/, "") ?? null,
    },
  });

  return NextResponse.json({ invite });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const twitter = searchParams.get("twitter");

  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  const dbUser = privyUser
    ? await prisma.user.findUnique({ where: { privyUserId: privyUser.id } })
    : null;

  const invites = await prisma.tableInvite.findMany({
    where: {
      OR: [
        wallet ? { inviteeWallet: wallet } : {},
        twitter ? { inviteeTwitter: twitter.replace(/^@/, "") } : {},
        dbUser ? { inviterId: dbUser.id } : {},
      ].filter((c) => Object.keys(c).length > 0),
    },
    include: {
      inviter: {
        select: { name: true, twitterHandle: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ invites });
}
