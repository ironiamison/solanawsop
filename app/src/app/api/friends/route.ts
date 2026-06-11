import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDatabase } from "@/lib/db-init";
import { findUserByHandleOrWallet, publicUserSelect } from "@/lib/social";
import { requireDbUser } from "@/lib/require-user";

export async function GET(req: Request) {
  await ensureDatabase();
  const me = await requireDbUser(req.headers.get("authorization"));
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await prisma.friendship.findMany({
    where: {
      OR: [{ userId: me.id }, { friendId: me.id }],
    },
    include: {
      user: { select: publicUserSelect() },
      friend: { select: publicUserSelect() },
    },
    orderBy: { createdAt: "desc" },
  });

  const friends: Array<{ friendshipId: string; user: (typeof rows)[0]["user"]; since: string }> = [];
  const incoming: Array<{ friendshipId: string; user: (typeof rows)[0]["user"]; since: string }> = [];
  const outgoing: Array<{ friendshipId: string; user: (typeof rows)[0]["friend"]; since: string }> = [];

  for (const row of rows) {
    if (row.status === "accepted") {
      const peer = row.userId === me.id ? row.friend : row.user;
      friends.push({
        friendshipId: row.id,
        user: peer,
        since: row.createdAt.toISOString(),
      });
    } else if (row.status === "pending") {
      if (row.friendId === me.id) {
        incoming.push({
          friendshipId: row.id,
          user: row.user,
          since: row.createdAt.toISOString(),
        });
      } else {
        outgoing.push({
          friendshipId: row.id,
          user: row.friend,
          since: row.createdAt.toISOString(),
        });
      }
    }
  }

  return NextResponse.json({ friends, incoming, outgoing });
}

export async function POST(req: Request) {
  await ensureDatabase();
  const me = await requireDbUser(req.headers.get("authorization"));
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const query = (body.query as string | undefined)?.trim();
  if (!query) {
    return NextResponse.json({ error: "Enter @handle or wallet" }, { status: 400 });
  }

  const target = await findUserByHandleOrWallet(query);
  if (!target) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  if (target.id === me.id) {
    return NextResponse.json({ error: "Cannot add yourself" }, { status: 400 });
  }

  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { userId: me.id, friendId: target.id },
        { userId: target.id, friendId: me.id },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Request already exists", friendship: existing }, { status: 409 });
  }

  const friendship = await prisma.friendship.create({
    data: { userId: me.id, friendId: target.id, status: "pending" },
    include: { friend: { select: publicUserSelect() } },
  });

  return NextResponse.json({ friendship });
}

export async function PATCH(req: Request) {
  await ensureDatabase();
  const me = await requireDbUser(req.headers.get("authorization"));
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { friendshipId, action } = body as {
    friendshipId?: string;
    action?: "accept" | "decline";
  };

  if (!friendshipId || !action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const row = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!row || row.friendId !== me.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (action === "decline") {
    await prisma.friendship.delete({ where: { id: friendshipId } });
    return NextResponse.json({ ok: true });
  }

  const updated = await prisma.friendship.update({
    where: { id: friendshipId },
    data: { status: "accepted" },
    include: { user: { select: publicUserSelect() } },
  });

  return NextResponse.json({ friendship: updated });
}
