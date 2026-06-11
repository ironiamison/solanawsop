const DEFAULT_ORIGINS = [
  "https://solanawsop.com",
  "https://www.solanawsop.com",
  "http://localhost:3000",
  "http://localhost:3001",
];

/** Origins allowed for Socket.io and cross-origin demo HTTP API. */
export function allowedSocketOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS?.trim();
  if (!raw) return DEFAULT_ORIGINS;
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
}

export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false;
  return allowedSocketOrigins().includes(origin);
}
