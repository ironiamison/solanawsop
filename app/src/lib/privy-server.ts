import { PrivyClient } from "@privy-io/server-auth";

let client: PrivyClient | null = null;

export function getPrivyClient(): PrivyClient {
  if (!client) {
    const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;
    if (!appId || !appSecret) {
      throw new Error("Privy server credentials not configured");
    }
    client = new PrivyClient(appId, appSecret);
  }
  return client;
}

export async function verifyPrivyToken(authHeader: string | null) {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  try {
    const privy = getPrivyClient();
    const claims = await privy.verifyAuthToken(token);
    const user = await privy.getUser(claims.userId);
    return user;
  } catch {
    return null;
  }
}
