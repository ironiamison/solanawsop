import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDatabase } from "@/lib/db-init";
import { twitterFromPrivy, upsertUserFromPrivy } from "@/lib/privy-user-sync";
import { verifyPrivyToken } from "@/lib/privy-server";
import {
  applyReferralCode,
  awardTwitterVerification,
  ensureReferralCode,
} from "@/lib/rewards";

export async function POST(req: Request) {
  const privyUser = await verifyPrivyToken(req.headers.get("authorization"));
  if (!privyUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureDatabase();

    const body = await req.json().catch(() => ({}));
    const pendingReferral = (body as { referralCode?: string }).referralCode;

    const user = await upsertUserFromPrivy(privyUser);

    await ensureReferralCode(user.id);

    if (pendingReferral) {
      await applyReferralCode(user.id, pendingReferral);
    }

    const { twitterHandle } = twitterFromPrivy(privyUser);
    let twitterReward: { awarded: boolean; points?: number } | null = null;
    if (twitterHandle) {
      twitterReward = await awardTwitterVerification(user.id);
    }

    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    return NextResponse.json({
      user: fresh,
      twitterReward,
      pointsAwarded: twitterReward?.awarded ? twitterReward.points : undefined,
    });
  } catch (e) {
    console.error("[profile/sync]", e);
    const message =
      e instanceof Error && e.message.includes("Unique constraint")
        ? "Profile conflict — refresh and try again."
        : "Could not save profile. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
