import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaUrl?: string;
};

function databaseUrl(): string {
  return process.env.DATABASE_URL ?? "file:./prisma/dev.db";
}

function createPrismaClient(url: string): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export function getPrismaClient(): PrismaClient {
  const url = databaseUrl();
  if (globalForPrisma.prisma && globalForPrisma.prismaUrl === url) {
    return globalForPrisma.prisma;
  }
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect();
  }
  const client = createPrismaClient(url);
  globalForPrisma.prisma = client;
  globalForPrisma.prismaUrl = url;
  return client;
}

/** Prisma client — always uses the current `DATABASE_URL` (Vercel `/tmp` after init). */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
