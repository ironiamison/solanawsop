import type { User as PrivyUser } from "@privy-io/server-auth";
import { prisma } from "@/lib/db";

export function twitterFromPrivy(privyUser: PrivyUser) {
  const twitter = privyUser.linkedAccounts?.find(
    (a) => a.type === "twitter_oauth"
  );
  const twitterHandle =
    twitter && "username" in twitter
      ? twitter.username?.toLowerCase() ?? null
      : null;
  const twitterId =
    twitter && "subject" in twitter ? twitter.subject ?? null : null;
  const twitterName =
    (twitter && "name" in twitter && twitter.name) ||
    privyUser.twitter?.name ||
    undefined;
  const twitterImage =
    (twitter && "profilePictureUrl" in twitter && twitter.profilePictureUrl) ||
    privyUser.twitter?.profilePictureUrl ||
    undefined;

  return { twitterHandle, twitterId, twitterName, twitterImage };
}

export function linkedSolanaWallet(privyUser: PrivyUser): string | null {
  const solanaWallet = privyUser.linkedAccounts?.find(
    (a) => a.type === "wallet" && "chainType" in a && a.chainType === "solana"
  );
  return solanaWallet && "address" in solanaWallet ? solanaWallet.address : null;
}

/** Only bind wallet if Privy linked it and no other user owns that address. */
async function safeWalletForUser(
  privyUserId: string,
  walletAddress: string | null
): Promise<string | undefined> {
  if (!walletAddress) return undefined;
  const taken = await prisma.user.findFirst({
    where: {
      walletAddress,
      NOT: { privyUserId },
    },
    select: { id: true },
  });
  return taken ? undefined : walletAddress;
}

export async function upsertUserFromPrivy(privyUser: PrivyUser) {
  const { twitterHandle, twitterId, twitterName, twitterImage } =
    twitterFromPrivy(privyUser);
  const linkedWallet = await safeWalletForUser(
    privyUser.id,
    linkedSolanaWallet(privyUser)
  );

  return prisma.user.upsert({
    where: { privyUserId: privyUser.id },
    create: {
      privyUserId: privyUser.id,
      twitterHandle,
      twitterId: twitterId ?? undefined,
      name: twitterName,
      image: twitterImage,
      walletAddress: linkedWallet,
    },
    update: {
      twitterHandle: twitterHandle ?? undefined,
      twitterId: twitterId ?? undefined,
      name: twitterName,
      image: twitterImage,
      ...(linkedWallet ? { walletAddress: linkedWallet } : {}),
    },
  });
}
