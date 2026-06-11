import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

  const body = await req.json().catch(() => ({}));
  const walletFromClient = (body as { walletAddress?: string }).walletAddress;
  const pendingReferral = (body as { referralCode?: string }).referralCode;

  const twitter = privyUser.linkedAccounts?.find(
    (a) => a.type === "twitter_oauth"
  );
  const twitterHandle =
    twitter && "username" in twitter ? twitter.username?.toLowerCase() : null;
  const twitterId =
    twitter && "subject" in twitter ? twitter.subject : null;

  const solanaWallet = privyUser.linkedAccounts?.find(
    (a) => a.type === "wallet" && "chainType" in a && a.chainType === "solana"
  );
  const linkedWallet =
    solanaWallet && "address" in solanaWallet ? solanaWallet.address : null;

  const walletAddress = walletFromClient ?? linkedWallet ?? null;

  const user = await prisma.user.upsert({
    where: { privyUserId: privyUser.id },
    create: {
      privyUserId: privyUser.id,
      twitterHandle,
      twitterId: twitterId ?? undefined,
      name: privyUser.twitter?.name ?? undefined,
      image: privyUser.twitter?.profilePictureUrl ?? undefined,
      walletAddress: walletAddress ?? undefined,
    },
    update: {
      twitterHandle: twitterHandle ?? undefined,
      twitterId: twitterId ?? undefined,
      name: privyUser.twitter?.name ?? undefined,
      image: privyUser.twitter?.profilePictureUrl ?? undefined,
      ...(walletAddress ? { walletAddress } : {}),
    },
  });

  await ensureReferralCode(user.id);

  if (pendingReferral) {
    await applyReferralCode(user.id, pendingReferral);
  }

  let twitterReward: { awarded: boolean; points?: number } | null = null;
  if (twitterHandle) {
    twitterReward = await awardTwitterVerification(user.id);
  }

  const fresh = await prisma.user.findUnique({ where: { id: user.id } });
  return NextResponse.json({ user: fresh, twitterReward });
}
