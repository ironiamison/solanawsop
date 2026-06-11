import { NextResponse } from "next/server";
import { requireDbUser } from "@/lib/require-user";
import {
  ensureReferralCode,
  REWARD_POINTS,
  referralLinkForCode,
} from "@/lib/rewards";

export async function GET(req: Request) {
  const user = await requireDbUser(req.headers.get("authorization"));
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const code = await ensureReferralCode(user.id);
  const origin = new URL(req.url).origin;

  return NextResponse.json({
    referralCode: code,
    referralLink: referralLinkForCode(code, origin),
    rewardPoints: user.rewardPoints,
    playRewardPoints: user.playRewardPoints,
    referralRewardPoints: user.referralRewardPoints,
    referralsCount: user.referralsCount,
    pointValues: REWARD_POINTS,
  });
}
