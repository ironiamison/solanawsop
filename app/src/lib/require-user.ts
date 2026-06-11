import { ensureDatabase } from "@/lib/db-init";
import { prisma } from "@/lib/db";
import { upsertUserFromPrivy } from "@/lib/privy-user-sync";
import { verifyPrivyToken } from "@/lib/privy-server";

export async function requireDbUser(authHeader: string | null) {
  const privyUser = await verifyPrivyToken(authHeader);
  if (!privyUser) return null;

  await ensureDatabase();

  let user = await prisma.user.findUnique({
    where: { privyUserId: privyUser.id },
  });

  if (!user) {
    user = await upsertUserFromPrivy(privyUser);
  }

  return user;
}
