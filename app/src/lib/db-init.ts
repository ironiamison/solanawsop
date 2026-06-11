import { copyFileSync, existsSync } from "fs";
import { join } from "path";
import { prisma } from "@/lib/db";

const globalInit = globalThis as unknown as { dbReady?: Promise<void> };

const VERCEL_DB_PATH = "/tmp/solanawsop.db";
const BUNDLED_DB_PATH = join(process.cwd(), "prisma/vercel.db");

function databaseUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  if (process.env.VERCEL) {
    return `file:${VERCEL_DB_PATH}`;
  }
  return process.env.DATABASE_URL ?? "file:./prisma/dev.db";
}

function seedVercelDatabase(): void {
  if (!process.env.VERCEL) return;
  if (existsSync(VERCEL_DB_PATH)) return;
  if (!existsSync(BUNDLED_DB_PATH)) {
    throw new Error("Missing prisma/vercel.db — run prisma db push in the Vercel build.");
  }
  copyFileSync(BUNDLED_DB_PATH, VERCEL_DB_PATH);
}

/** Point Prisma at a writable DB and copy the build-time schema on Vercel cold starts. */
export async function ensureDatabase(): Promise<void> {
  if (globalInit.dbReady) return globalInit.dbReady;

  globalInit.dbReady = (async () => {
    const url = databaseUrl();
    process.env.DATABASE_URL = url;
    seedVercelDatabase();
    await prisma.$connect();
    await prisma.user.count();
  })();

  return globalInit.dbReady;
}
