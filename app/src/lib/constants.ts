import { PublicKey } from "@solana/web3.js";

export const PROGRAM_ID = new PublicKey(
  "2EjVHs2eD6fHAh7vjKMff6zuGRM8NnbKGrJqtmnLfPc7"
);

/** Canonical site URL — invite links, referrals, OG tags */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.NODE_ENV === "production"
    ? "https://solanawsop.com"
    : "http://localhost:3001");

/**
 * Socket.io server origin. Unset = same host as the page (works on `npm run dev` + VPS).
 * On Vercel, point this at a Node host running `server.ts` (Railway, Render, VPS).
 */
export const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || undefined;

/** Product brand */
export const BRAND_NAME =
  process.env.NEXT_PUBLIC_BRAND_NAME ?? "SolanaWSOP";
export const BRAND_TAGLINE = "On chain · real game";
export const BRAND_LOGO_SRC = "/assets/brand/solanawsop-logo.png";
/** Transparent trim for demo / overlay surfaces */
export const BRAND_LOGO_DEMO_SRC = "/assets/brand/solanawsop-logo-demo.png";
/** Trimmed chip lockup for sidebar — “POKER ON SOLANA” */
export const BRAND_LOGO_SIDEBAR_SRC = "/assets/brand/solanawsop-logo-sidebar.png";
/** Full chip lockup — “POKER ON SOLANA” — loading screen & splash */
export const BRAND_LOGO_HERO_SRC = "/assets/brand/solanawsop-logo-hero.png";
/** Solana chip mark — icon, lockups, watermarks */
export const BRAND_CHIP_SRC = "/assets/brand/solanawsop-chip.png";
/** Poker chip mark — favicon, footer watermark, tight spaces */
export const BRAND_ICON_SRC = BRAND_CHIP_SRC;
/** Gradient wordmark — compact headers */
export const BRAND_WORDMARK_SRC = "/assets/brand/solanawsop-wordmark.png";

/** In-game chip / token symbol */
export const TOKEN_SYMBOL =
  process.env.NEXT_PUBLIC_TOKEN_SYMBOL ?? "$WSOP";
export const TOKEN_NAME =
  process.env.NEXT_PUBLIC_TOKEN_NAME ?? "SolanaWSOP";
export const PUMP_FUN_URL =
  process.env.NEXT_PUBLIC_PUMP_FUN_URL ?? "https://pump.fun";

export const SOLANA_NETWORK =
  process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? "devnet";

export const SHOW_DEV_CONTROLS =
  process.env.NEXT_PUBLIC_SHOW_DEV_CONTROLS === "true";

/** Default public room — concentrate liquidity here at launch */
export const FEATURED_TIER_INDEX = 0;

export const BUY_IN_TIERS = [
  { index: 0, label: `50K ${TOKEN_SYMBOL}`, amount: 50_000 },
  { index: 1, label: `100K ${TOKEN_SYMBOL}`, amount: 100_000 },
  { index: 2, label: `250K ${TOKEN_SYMBOL}`, amount: 250_000 },
  { index: 3, label: `500K ${TOKEN_SYMBOL}`, amount: 500_000 },
  { index: 4, label: `1M ${TOKEN_SYMBOL}`, amount: 1_000_000 },
] as const;

export const MAX_PLAYERS = 6;

export const PRIVATE_TABLE_RAKE_PERCENT = 10;

/** Flip to true when private SOL tables are live on-chain */
export const PRIVATE_TABLES_ENABLED =
  process.env.NEXT_PUBLIC_PRIVATE_TABLES_ENABLED === "true";

export const TOKEN_DECIMALS = 6;

export function formatTokens(rawAmount: number | bigint): string {
  const n = Number(rawAmount) / Math.pow(10, TOKEN_DECIMALS);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/** Format on-chain wager units for UI (shows token symbol) */
export function formatWager(rawAmount: number | bigint): string {
  return `${formatTokens(rawAmount)} ${TOKEN_SYMBOL}`;
}

/** @deprecated use formatTokens — kept for on-chain lamport display during migration */
export const LAMPORTS_PER_SOL = 1_000_000_000;
export function formatSol(lamports: number | bigint): string {
  return (Number(lamports) / LAMPORTS_PER_SOL).toFixed(4);
}

/** Compact SOL label for private-table UI */
export function formatSolCompact(lamports: number | bigint): string {
  const sol = Number(lamports) / LAMPORTS_PER_SOL;
  if (sol >= 1) return `${sol.toFixed(2)} SOL`;
  if (sol >= 0.01) return `${sol.toFixed(3)} SOL`;
  return `${sol.toFixed(4)} SOL`;
}

export function solToLamports(sol: number): number {
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

export function formatWagerSol(lamports: number | bigint): string {
  return formatSolCompact(lamports);
}

export function explorerTxUrl(signature: string): string {
  const cluster =
    SOLANA_NETWORK === "mainnet-beta" ? "" : `?cluster=${SOLANA_NETWORK}`;
  return `https://solscan.io/tx/${signature}${cluster}`;
}

/** Weekly community tournament — room tier + schedule */
export const WEEKLY_TOURNAMENT = {
  title: "Friday Night Hold'em",
  subtitle: "Hosted table · all welcome",
  tierIndex: 1,
  hourUtc: 20,
  minuteUtc: 0,
} as const;
