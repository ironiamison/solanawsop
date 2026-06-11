import { SOCKET_URL } from "@/lib/constants";

/** Same-origin demo HTTP — Vercel API + shared Redis (fast join/lobby). */
export function demoHttpApiUrl(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

/** @deprecated Socket host URL — prefer demoHttpApiUrl for HTTP. */
export function demoApiUrl(path: string): string {
  const base = SOCKET_URL?.replace(/\/$/, "") ?? "";
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

const DEFAULT_TIMEOUT_MS = 12_000;

export async function fetchDemoJson<T>(
  path: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<T> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(demoHttpApiUrl(path), {
      ...init,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Demo API ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    window.clearTimeout(timer);
  }
}

function parseDemoResponse<T>(res: Response, raw: string): T {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error(res.ok ? "Empty server response" : `Server error (${res.status})`);
  }
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error(
      res.status === 503
        ? "Table busy — try again in a moment"
        : `Server error (${res.status})`
    );
  }
}

export async function postDemoJson<T>(
  path: string,
  body: Record<string, unknown>,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(demoHttpApiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const raw = await res.text();
    return parseDemoResponse<T>(res, raw);
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw err;
  } finally {
    window.clearTimeout(timer);
  }
}
