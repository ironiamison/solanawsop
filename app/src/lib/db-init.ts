import { execSync } from "child_process";
import { existsSync } from "fs";
import { prisma } from "@/lib/db";

const globalInit = globalThis as unknown as { dbReady?: Promise<void> };

function databaseUrl(): string {
  if (process.env.TURSO_DATABASE_URL) {
    return process.env.TURSO_DATABASE_URL;
  }
  if (process.env.VERCEL) {
    return "file:/tmp/solanawsop.db";
  }
  return process.env.DATABASE_URL ?? "file:./prisma/dev.db";
}

/** Create schema on first boot (Vercel /tmp is empty on cold start). */
export async function ensureDatabase(): Promise<void> {
  if (globalInit.dbReady) return globalInit.dbReady;

  globalInit.dbReady = (async () => {
    const url = databaseUrl();
    process.env.DATABASE_URL = url;

    if (url.startsWith("file:")) {
      const path = url.replace(/^file:/, "");
      if (!existsSync(path)) {
        execSync("npx prisma db push --skip-generate", {
          env: { ...process.env, DATABASE_URL: url },
          stdio: "pipe",
        });
        return;
      }
    }

    try {
      await prisma.user.count();
    } catch {
      execSync("npx prisma db push --skip-generate", {
        env: { ...process.env, DATABASE_URL: url },
        stdio: "pipe",
      });
    }
  })();

  return globalInit.dbReady;
}
