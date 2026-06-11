import { prisma } from "@/lib/db";
import { TOKEN_DECIMALS } from "@/lib/constants";

const METRIC_ID = "global";

function seedBurnedRaw(): bigint {
  const n = process.env.FLYWHEEL_SEED_BURNED_TOKENS;
  if (!n) return BigInt(0);
  return BigInt(Math.floor(parseFloat(n) * Math.pow(10, TOKEN_DECIMALS)));
}

function seedOtcRaw(): bigint {
  const n = process.env.FLYWHEEL_SEED_OTC_TOKENS;
  if (!n) return BigInt(0);
  return BigInt(Math.floor(parseFloat(n) * Math.pow(10, TOKEN_DECIMALS)));
}

function seedRewardsRaw(): bigint {
  const n = process.env.FLYWHEEL_SEED_CREATOR_REWARDS_TOKENS;
  if (!n) return BigInt(0);
  return BigInt(Math.floor(parseFloat(n) * Math.pow(10, TOKEN_DECIMALS)));
}

function seedBurnSigs(): string[] {
  const raw = process.env.FLYWHEEL_SEED_BURN_TXS;
  if (!raw) return [];
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function getOrCreateFlywheelMetrics() {
  const existing = await prisma.flywheelMetric.findUnique({
    where: { id: METRIC_ID },
  });
  if (existing) return existing;

  return prisma.flywheelMetric.create({
    data: {
      id: METRIC_ID,
      totalBurnedRaw: seedBurnedRaw(),
      totalOtcPaidRaw: seedOtcRaw(),
      creatorRewardsRaw: seedRewardsRaw(),
      burnTxSignatures: JSON.stringify(seedBurnSigs()),
    },
  });
}

export function parseBurnSignatures(json: string): string[] {
  try {
    const parsed = JSON.parse(json) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((s): s is string => typeof s === "string")
      : [];
  } catch {
    return [];
  }
}
