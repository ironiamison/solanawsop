import { prisma } from "@/lib/db";

export const REFERRAL_STORAGE_KEY = "solanawsop_ref";

export const REWARD_POINTS = {
  HAND_PLAYED: 25,
  REFERRAL_INVITE: 150,
  REFERRAL_WELCOME: 50,
  TWITTER_VERIFY: 100,
} as const;

export const REDEMPTION_TIERS = [
  {
    id: "table_credit_5k",
    label: "5K table credit",
    description: "Bonus play chips for public cash tables",
    pointsCost: 500,
  },
  {
    id: "table_credit_25k",
    label: "25K table credit",
    description: "Stack boost — applied to your next session",
    pointsCost: 1500,
  },
  {
    id: "featured_seat",
    label: "Featured tournament seat",
    description: "Reserved entry for the next Friday Night Hold'em",
    pointsCost: 5000,
  },
] as const;

export type RedemptionTierId = (typeof REDEMPTION_TIERS)[number]["id"];

function randomReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomReferralCode();
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: code },
        select: { referralCode: true },
      });
      if (updated.referralCode) return updated.referralCode;
    } catch {
      // collision — retry
    }
  }

  const fallback = `WSOP${userId.slice(-6).toUpperCase()}`;
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { referralCode: fallback },
    select: { referralCode: true },
  });
  return updated.referralCode ?? fallback;
}

export async function applyReferralCode(
  userId: string,
  rawCode: string
): Promise<{ ok: boolean; error?: string }> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Invalid code" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referredById: true, referralCode: true },
  });
  if (!user) return { ok: false, error: "User not found" };
  if (user.referredById) return { ok: false, error: "Already referred" };
  if (user.referralCode === code) return { ok: false, error: "Cannot use your own code" };

  const inviter = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true },
  });
  if (!inviter) return { ok: false, error: "Code not found" };
  if (inviter.id === userId) return { ok: false, error: "Cannot use your own code" };

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: {
        referredById: inviter.id,
        rewardPoints: { increment: REWARD_POINTS.REFERRAL_WELCOME },
      },
    });
    await tx.user.update({
      where: { id: inviter.id },
      data: {
        referralsCount: { increment: 1 },
        rewardPoints: { increment: REWARD_POINTS.REFERRAL_INVITE },
        referralRewardPoints: { increment: REWARD_POINTS.REFERRAL_INVITE },
      },
    });
    await tx.rewardEvent.create({
      data: {
        userId,
        type: "referral_welcome",
        points: REWARD_POINTS.REFERRAL_WELCOME,
        meta: JSON.stringify({ inviterId: inviter.id, code }),
      },
    });
    await tx.rewardEvent.create({
      data: {
        userId: inviter.id,
        type: "referral_invite",
        points: REWARD_POINTS.REFERRAL_INVITE,
        meta: JSON.stringify({ inviteeId: userId, code }),
      },
    });
  });

  return { ok: true };
}

export async function recordHandPlayedReward(
  userId: string,
  handNumber: number,
  source: "demo" | "onchain"
): Promise<{ awarded: boolean; points?: number }> {
  const meta = JSON.stringify({ handNumber, source });
  const dup = await prisma.rewardEvent.findFirst({
    where: { userId, type: "hand_played", meta },
  });
  if (dup) return { awarded: false };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        handsPlayed: { increment: 1 },
        rewardPoints: { increment: REWARD_POINTS.HAND_PLAYED },
        playRewardPoints: { increment: REWARD_POINTS.HAND_PLAYED },
      },
    }),
    prisma.rewardEvent.create({
      data: {
        userId,
        type: "hand_played",
        points: REWARD_POINTS.HAND_PLAYED,
        meta,
      },
    }),
  ]);

  return { awarded: true, points: REWARD_POINTS.HAND_PLAYED };
}

export async function awardTwitterVerification(
  userId: string
): Promise<{ awarded: boolean; points?: number }> {
  const dup = await prisma.rewardEvent.findFirst({
    where: { userId, type: "twitter_verified" },
  });
  if (dup) return { awarded: false };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        rewardPoints: { increment: REWARD_POINTS.TWITTER_VERIFY },
        playRewardPoints: { increment: REWARD_POINTS.TWITTER_VERIFY },
      },
    }),
    prisma.rewardEvent.create({
      data: {
        userId,
        type: "twitter_verified",
        points: REWARD_POINTS.TWITTER_VERIFY,
      },
    }),
  ]);

  return { awarded: true, points: REWARD_POINTS.TWITTER_VERIFY };
}

export async function redeemRewardPoints(
  userId: string,
  tierId: RedemptionTierId
): Promise<{ ok: boolean; error?: string; redemption?: { id: string; perkLabel: string; pointsSpent: number } }> {
  const tier = REDEMPTION_TIERS.find((t) => t.id === tierId);
  if (!tier) return { ok: false, error: "Invalid tier" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { rewardPoints: true },
  });
  if (!user) return { ok: false, error: "User not found" };
  if (user.rewardPoints < tier.pointsCost) {
    return { ok: false, error: "Not enough points" };
  }

  const redemption = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: userId },
      data: { rewardPoints: { decrement: tier.pointsCost } },
      select: { rewardPoints: true },
    });
    if (updated.rewardPoints < 0) {
      throw new Error("Insufficient points");
    }

    const row = await tx.pointRedemption.create({
      data: {
        userId,
        tierId: tier.id,
        pointsSpent: tier.pointsCost,
        perkLabel: tier.label,
        status: "pending",
      },
    });

    await tx.rewardEvent.create({
      data: {
        userId,
        type: "point_redemption",
        points: -tier.pointsCost,
        meta: JSON.stringify({ tierId: tier.id, redemptionId: row.id }),
      },
    });

    return row;
  });

  return {
    ok: true,
    redemption: {
      id: redemption.id,
      perkLabel: redemption.perkLabel,
      pointsSpent: redemption.pointsSpent,
    },
  };
}

export function referralLinkForCode(code: string, origin?: string): string {
  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/?ref=${encodeURIComponent(code)}`;
}
