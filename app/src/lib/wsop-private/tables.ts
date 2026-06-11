import { prisma } from "@/lib/db";
import {
  BUY_IN_TIERS,
  TOKEN_DECIMALS,
  TOKEN_SYMBOL,
} from "@/lib/constants";

export function tierIndexToStack(tierIndex: number): number {
  const tier = BUY_IN_TIERS[tierIndex] ?? BUY_IN_TIERS[1];
  return tier.amount * Math.pow(10, TOKEN_DECIMALS);
}

export function newWsopRoomId(): string {
  return `wsop-${Math.random().toString(36).slice(2, 10)}`;
}

export function wsopTablePlayUrl(roomId: string): string {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (typeof window !== "undefined" ? window.location.origin : "https://solanawsop.com");
  return `${base}/wsop-table/${roomId}`;
}

export async function getWsopTable(roomId: string) {
  return prisma.wsopPrivateTable.findUnique({ where: { roomId } });
}

export async function listWsopTablesForWallet(wallet: string) {
  return prisma.wsopPrivateTable.findMany({
    where: { creatorWallet: wallet },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function canJoinWsopTable(
  roomId: string,
  wallet: string | null | undefined
): Promise<true | string> {
  const table = await getWsopTable(roomId);
  if (!table) return "Table not found";
  if (!wallet) return `Connect wallet to join this ${TOKEN_SYMBOL} table`;
  if (table.creatorWallet === wallet) return true;
  const invited = JSON.parse(table.invitedWallets || "[]") as string[];
  if (invited.includes(wallet)) return true;
  return "Invite only — ask the host to add your wallet or @handle";
}

export async function addWsopInvite(roomId: string, wallet: string): Promise<void> {
  const table = await getWsopTable(roomId);
  if (!table) throw new Error("Table not found");
  const invited = new Set(JSON.parse(table.invitedWallets || "[]") as string[]);
  invited.add(wallet);
  await prisma.wsopPrivateTable.update({
    where: { roomId },
    data: { invitedWallets: JSON.stringify([...invited]) },
  });
}
