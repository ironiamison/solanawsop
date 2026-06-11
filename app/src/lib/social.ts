import { prisma } from "@/lib/db";

export type PublicUser = {
  id: string;
  name: string | null;
  twitterHandle: string | null;
  image: string | null;
  walletAddress: string | null;
  handsWon: number;
  handsPlayed: number;
  rewardPoints?: number;
};

export function publicUserSelect() {
  return {
    id: true,
    name: true,
    twitterHandle: true,
    image: true,
    walletAddress: true,
    handsWon: true,
    handsPlayed: true,
    rewardPoints: true,
  } as const;
}

export async function searchUsersByTwitter(
  query: string,
  limit = 8,
  excludeUserId?: string
) {
  const term = query.trim().replace(/^@/, "");
  if (term.length < 2) return [];

  return prisma.user.findMany({
    where: {
      twitterHandle: { not: null },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      OR: [
        { twitterHandle: { contains: term } },
        { twitterHandle: { contains: term.toLowerCase() } },
        { name: { contains: term } },
      ],
    },
    take: limit,
    orderBy: [{ rewardPoints: "desc" }, { handsWon: "desc" }],
    select: publicUserSelect(),
  });
}

export async function findUserByHandleOrWallet(query: string) {
  const q = query.trim().replace(/^@/, "");
  if (!q) return null;
  return prisma.user.findFirst({
    where: {
      OR: [
        { twitterHandle: q },
        { twitterHandle: q.toLowerCase() },
        { walletAddress: q },
      ],
    },
    select: publicUserSelect(),
  });
}
