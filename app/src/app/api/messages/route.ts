import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { publicUserSelect } from "@/lib/social";
import { requireDbUser } from "@/lib/require-user";

export async function GET(req: Request) {
  const me = await requireDbUser(req.headers.get("authorization"));
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const peerId = searchParams.get("peerId");

  if (peerId) {
    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: me.id, recipientId: peerId },
          { senderId: peerId, recipientId: me.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 100,
      include: {
        sender: { select: publicUserSelect() },
        recipient: { select: publicUserSelect() },
      },
    });

    await prisma.directMessage.updateMany({
      where: { senderId: peerId, recipientId: me.id, readAt: null },
      data: { readAt: new Date() },
    });

    return NextResponse.json({ messages });
  }

  const all = await prisma.directMessage.findMany({
    where: {
      OR: [{ senderId: me.id }, { recipientId: me.id }],
    },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      sender: { select: publicUserSelect() },
      recipient: { select: publicUserSelect() },
    },
  });

  const threadMap = new Map<
    string,
    {
      peer: (typeof all)[0]["sender"];
      lastMessage: (typeof all)[0];
      unreadCount: number;
    }
  >();

  for (const msg of all) {
    const peer = msg.senderId === me.id ? msg.recipient : msg.sender;
    if (!threadMap.has(peer.id)) {
      threadMap.set(peer.id, {
        peer,
        lastMessage: msg,
        unreadCount: 0,
      });
    }
    if (msg.recipientId === me.id && !msg.readAt) {
      const t = threadMap.get(peer.id)!;
      t.unreadCount += 1;
    }
  }

  const threads = [...threadMap.values()].sort(
    (a, b) => b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime()
  );

  return NextResponse.json({ threads });
}

export async function POST(req: Request) {
  const me = await requireDbUser(req.headers.get("authorization"));
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { recipientId, body: text } = body as { recipientId?: string; body?: string };

  if (!recipientId || !text?.trim()) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const recipient = await prisma.user.findUnique({ where: { id: recipientId } });
  if (!recipient) {
    return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
  }

  const areFriends = await prisma.friendship.findFirst({
    where: {
      status: "accepted",
      OR: [
        { userId: me.id, friendId: recipientId },
        { userId: recipientId, friendId: me.id },
      ],
    },
  });
  if (!areFriends) {
    return NextResponse.json({ error: "You can only DM friends" }, { status: 403 });
  }

  const message = await prisma.directMessage.create({
    data: {
      senderId: me.id,
      recipientId,
      body: text.trim().slice(0, 2000),
    },
    include: {
      sender: { select: publicUserSelect() },
      recipient: { select: publicUserSelect() },
    },
  });

  return NextResponse.json({ message });
}
