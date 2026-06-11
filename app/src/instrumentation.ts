export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureDatabase } = await import("@/lib/db-init");
    await ensureDatabase();
  }
}
