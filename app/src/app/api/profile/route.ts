import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";

export async function GET(req: Request) {
  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  if (!privyUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { privyUserId: privyUser.id },
  });

  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  if (!privyUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { bio, name } = body as { bio?: string; name?: string };

  const user = await prisma.user.update({
    where: { privyUserId: privyUser.id },
    data: {
      ...(bio !== undefined ? { bio } : {}),
      ...(name !== undefined ? { name } : {}),
    },
  });

  return NextResponse.json({ user });
}
