import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";
import {
  listWsopTablesForWallet,
  newWsopRoomId,
  tierIndexToStack,
} from "@/lib/wsop-private/tables";
import { BUY_IN_TIERS } from "@/lib/constants";

function serialize(t: {
  id: string;
  roomId: string;
  creatorWallet: string;
  buyInRaw: bigint;
  name: string | null;
  invitedWallets: string;
  createdAt: Date;
}) {
  const tier = BUY_IN_TIERS.find(
    (x) => x.amount * 1_000_000 === Number(t.buyInRaw)
  );
  return {
    ...t,
    buyInRaw: t.buyInRaw.toString(),
    tierLabel: tier?.label ?? `${Number(t.buyInRaw) / 1_000_000}`,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet");
  const roomId = searchParams.get("roomId");

  if (roomId) {
    const table = await prisma.wsopPrivateTable.findUnique({ where: { roomId } });
    if (!table) return NextResponse.json({ table: null });
    return NextResponse.json({ table: serialize(table) });
  }

  if (wallet) {
    const tables = await listWsopTablesForWallet(wallet);
    return NextResponse.json({ tables: tables.map(serialize) });
  }

  return NextResponse.json({ tables: [] });
}

export async function POST(req: Request) {
  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  if (!privyUser) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const body = await req.json();
  const { creatorWallet, tierIndex, name } = body as {
    creatorWallet?: string;
    tierIndex?: number;
    name?: string;
  };

  if (!creatorWallet) {
    return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  }

  const idx = Number.isFinite(tierIndex) ? Number(tierIndex) : 1;
  const buyInRaw = BigInt(tierIndexToStack(idx));
  const roomId = newWsopRoomId();

  const table = await prisma.wsopPrivateTable.create({
    data: {
      roomId,
      creatorWallet,
      buyInRaw,
      name: name?.trim() || `Private ${BUY_IN_TIERS[idx]?.label ?? "table"}`,
      invitedWallets: JSON.stringify([creatorWallet]),
    },
  });

  return NextResponse.json({ ok: true, table: serialize(table) });
}
