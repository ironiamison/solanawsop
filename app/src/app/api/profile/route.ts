import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDatabase } from "@/lib/db-init";
import { verifyPrivyToken } from "@/lib/privy-server";
import { awardTwitterVerification } from "@/lib/rewards";

export async function GET(req: Request) {
  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  if (!privyUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();

    let user = await prisma.user.findUnique({
      where: { privyUserId: privyUser.id },
    });

    if (user?.twitterHandle) {
      await awardTwitterVerification(user.id);
      user = await prisma.user.findUnique({
        where: { privyUserId: privyUser.id },
      });
    }

    return NextResponse.json({ user });
  } catch (e) {
    console.error("[profile/GET]", e);
    return NextResponse.json(
      { error: "Could not load profile." },
      { status: 503 }
    );
  }
}

export async function PATCH(req: Request) {
  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  if (!privyUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();

    const body = await req.json();
    const { bio, name } = body as { bio?: string; name?: string };

    const user = await prisma.user.upsert({
      where: { privyUserId: privyUser.id },
      create: {
        privyUserId: privyUser.id,
        ...(bio !== undefined ? { bio } : {}),
        ...(name !== undefined ? { name } : {}),
      },
      update: {
        ...(bio !== undefined ? { bio } : {}),
        ...(name !== undefined ? { name } : {}),
      },
    });

    return NextResponse.json({ user });
  } catch (e) {
    console.error("[profile/PATCH]", e);
    return NextResponse.json(
      { error: "Could not save profile." },
      { status: 503 }
    );
  }
}
