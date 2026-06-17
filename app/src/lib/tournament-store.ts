import { prisma } from "@/lib/db";
import { FEATURED_TOURNAMENT_ID } from "@/lib/tournaments";

const GRAND_OPENING_START = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 7);
  d.setUTCHours(20, 0, 0, 0);
  return d;
};

export async function ensureGrandOpeningTournament() {
  const startsAt = GRAND_OPENING_START();
  const registrationEndsAt = new Date(startsAt.getTime() - 60 * 60 * 1000);
  return prisma.tournament.upsert({
    where: { id: FEATURED_TOURNAMENT_ID },
    create: {
      id: FEATURED_TOURNAMENT_ID,
      title: "Grand Opening Bracket #1",
      subtitle:
        "Be the first champion on SolanaWSOP. Free entry — bracket play launches at start time.",
      buyInLabel: "FREE",
      prizePool: "1,000 USDC",
      maxPlayers: 256,
      status: "registering",
      startsAt,
      registrationEndsAt,
    },
    update: {
      title: "Grand Opening Bracket #1",
      status: "registering",
      startsAt,
      registrationEndsAt,
    },
  });
}

export async function listTournamentsWithCounts() {
  await ensureGrandOpeningTournament();
  const rows = await prisma.tournament.findMany({
    orderBy: { startsAt: "asc" },
    include: { _count: { select: { registrations: true } } },
  });
  return rows.map((t) => ({
    id: t.id,
    title: t.title,
    subtitle: t.subtitle,
    buyInLabel: t.buyInLabel,
    prizePool: t.prizePool,
    maxPlayers: t.maxPlayers,
    status: t.status,
    startsAt: t.startsAt.toISOString(),
    registrationEndsAt: t.registrationEndsAt?.toISOString() ?? null,
    registeredCount: t._count.registrations,
  }));
}

export async function registerForTournament(input: {
  tournamentId: string;
  walletAddress?: string | null;
  username?: string | null;
  privyUserId?: string | null;
}) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: input.tournamentId },
    include: { _count: { select: { registrations: true } } },
  });
  if (!tournament) {
    return { ok: false as const, error: "Tournament not found", status: 404 };
  }
  if (tournament.status !== "registering") {
    return { ok: false as const, error: "Registration closed", status: 400 };
  }
  if (
    tournament.registrationEndsAt &&
    Date.now() > tournament.registrationEndsAt.getTime()
  ) {
    return { ok: false as const, error: "Registration ended", status: 400 };
  }
  if (tournament._count.registrations >= tournament.maxPlayers) {
    return { ok: false as const, error: "Tournament full", status: 400 };
  }
  if (!input.walletAddress && !input.privyUserId) {
    return {
      ok: false as const,
      error: "Connect wallet or sign in to register",
      status: 400,
    };
  }

  const existing = await prisma.tournamentRegistration.findFirst({
    where: {
      tournamentId: input.tournamentId,
      OR: [
        input.walletAddress ? { walletAddress: input.walletAddress } : undefined,
        input.privyUserId ? { privyUserId: input.privyUserId } : undefined,
      ].filter(Boolean) as { walletAddress?: string; privyUserId?: string }[],
    },
  });
  if (existing) {
    return {
      ok: true as const,
      alreadyRegistered: true,
      registrationId: existing.id,
      status: 200,
    };
  }

  const reg = await prisma.tournamentRegistration.create({
    data: {
      tournamentId: input.tournamentId,
      walletAddress: input.walletAddress ?? null,
      username: input.username ?? null,
      privyUserId: input.privyUserId ?? null,
    },
  });
  return {
    ok: true as const,
    alreadyRegistered: false,
    registrationId: reg.id,
    status: 201,
  };
}
