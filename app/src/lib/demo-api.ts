import { SOCKET_URL } from "@/lib/constants";

/** Demo HTTP API base — socket host when split from Vercel, else same origin. */
export function demoApiUrl(path: string): string {
  const base = SOCKET_URL?.replace(/\/$/, "") ?? "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
