import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";
import { TOKEN_DECIMALS } from "@/lib/constants";

export async function GET(req: Request) {
  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  if (!privyUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { privyUserId: privyUser.id },
  });
  if (!user?.walletAddress) {
    return NextResponse.json({ redemptions: [] });
  }

  const redemptions = await prisma.otcRedemption.findMany({
    where: { walletAddress: user.walletAddress },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({
    redemptions: redemptions.map((r) => ({
      id: r.id,
      amountRaw: r.amountRaw.toString(),
      status: r.status,
      note: r.note,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  if (!privyUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { privyUserId: privyUser.id },
  });
  if (!user?.walletAddress) {
    return NextResponse.json(
      { error: "Link a Solana wallet before requesting OTC" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { amountTokens } = body as { amountTokens?: number };

  if (!amountTokens || amountTokens <= 0 || !Number.isFinite(amountTokens)) {
    return NextResponse.json(
      { error: "Enter a valid token amount" },
      { status: 400 }
    );
  }

  const amountRaw = BigInt(
    Math.floor(amountTokens * Math.pow(10, TOKEN_DECIMALS))
  );

  const redemption = await prisma.otcRedemption.create({
    data: {
      walletAddress: user.walletAddress,
      amountRaw,
      status: "pending",
      note: "Queued for OTC quote — paid from creator rewards, tokens burned on completion.",
    },
  });

  return NextResponse.json({
    redemption: {
      id: redemption.id,
      amountRaw: redemption.amountRaw.toString(),
      status: redemption.status,
      createdAt: redemption.createdAt.toISOString(),
    },
  });
}
