import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireDbUser } from "@/lib/require-user";

export async function GET(req: Request) {
  const me = await requireDbUser(req.headers.get("authorization"));
  if (!me) {
    return NextResponse.json({ unreadMessages: 0, pendingFriends: 0, tableInvites: 0 });
  }

  const [unreadMessages, pendingFriends, tableInvites] = await Promise.all([
    prisma.directMessage.count({
      where: { recipientId: me.id, readAt: null },
    }),
    prisma.friendship.count({
      where: { friendId: me.id, status: "pending" },
    }),
    prisma.tableInvite.count({
      where: {
        OR: [
          me.walletAddress ? { inviteeWallet: me.walletAddress } : {},
          me.twitterHandle ? { inviteeTwitter: me.twitterHandle } : {},
        ].filter((c) => Object.keys(c).length > 0),
      },
    }),
  ]);

  return NextResponse.json({ unreadMessages, pendingFriends, tableInvites });
}
