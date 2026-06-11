import { prisma } from "@/lib/db";
import { verifyPrivyToken } from "@/lib/privy-server";

export async function requireDbUser(authHeader: string | null) {
  const privyUser = await verifyPrivyToken(authHeader);
  if (!privyUser) return null;
  return prisma.user.findUnique({ where: { privyUserId: privyUser.id } });
}
