import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";

function serializeTable(t: {
  id: string;
  roomPubkey: string;
  creatorWallet: string;
  tableId: string;
  buyInLamports: bigint;
  name: string | null;
  createdAt: Date;
}) {
  return {
    ...t,
    buyInLamports: t.buyInLamports.toString(),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const room = searchParams.get("room");

  if (room) {
    const table = await prisma.privateTableMeta.findUnique({
      where: { roomPubkey: room },
    });
    if (!table) {
      return NextResponse.json({ table: null });
    }
    return NextResponse.json({ table: serializeTable(table) });
  }

  if (wallet) {
    const tables = await prisma.privateTableMeta.findMany({
      where: { creatorWallet: wallet },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({
      tables: tables.map(serializeTable),
    });
  }

  const tables = await prisma.privateTableMeta.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({
    tables: tables.map(serializeTable),
  });
}

export async function POST(req: Request) {
  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  const body = await req.json();
  const { roomPubkey, creatorWallet, tableId, buyInLamports, name } = body as {
    roomPubkey: string;
    creatorWallet: string;
    tableId: string;
    buyInLamports: string;
    name?: string;
  };

  if (!roomPubkey || !creatorWallet || !tableId || !buyInLamports) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const table = await prisma.privateTableMeta.create({
    data: {
      roomPubkey,
      creatorWallet,
      tableId,
      buyInLamports: BigInt(buyInLamports),
      name: name ?? `Private table ${tableId}`,
    },
  });

  if (privyUser) {
    const dbUser = await prisma.user.findUnique({
      where: { privyUserId: privyUser.id },
    });
    if (dbUser) {
      await prisma.tableInvite.create({
        data: {
          roomPubkey,
          inviterId: dbUser.id,
          inviteeWallet: creatorWallet,
        },
      });
    }
  }

  return NextResponse.json({
    table: { ...table, buyInLamports: table.buyInLamports.toString() },
  });
}
