#!/usr/bin/env node
/**
 * Install brand chip from user asset → transparent PNG + icon sizes.
 * - True RGBA PNG: copied as-is (trim + resize only).
 * - JPEG / white matte: keyed to transparency.
 *
 * Run: npm run process-brand-chip
 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BRAND = join(__dirname, "../public/assets/brand");
const DEFAULT_SRC =
  "/Users/jamison/.cursor/projects/Users-jamison-untitled-folder-4/assets/chip-334bb071-07ae-465d-9037-3e123917b8c3.png";

const SRC = process.env.BRAND_CHIP_SRC || DEFAULT_SRC;
const OUT = join(BRAND, "solanawsop-chip.png");

const WHITE_HARD = 250;
const WHITE_SOFT = 210;
/** Common “transparency preview” checkerboard grays */
const CHECKER_LO = 175;
const CHECKER_HI = 252;

function alphaForPixel(r, g, b) {
  const spread = Math.max(r, g, b) - Math.min(r, g, b);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  if (luma >= WHITE_HARD) return 0;
  if (spread <= 8 && luma >= CHECKER_LO && luma <= CHECKER_HI) {
    if (luma >= WHITE_SOFT) return 0;
    return Math.round(((WHITE_SOFT - luma) / (WHITE_SOFT - CHECKER_LO)) * 255);
  }
  if (luma >= WHITE_SOFT) {
    return Math.round(((WHITE_HARD - luma) / (WHITE_HARD - WHITE_SOFT)) * 255);
  }
  return 255;
}

if (!existsSync(SRC)) {
  console.error("Source chip not found:", SRC);
  process.exit(1);
}

copyFileSync(SRC, join(BRAND, "solanawsop-chip-source.png"));

const meta = await sharp(SRC).metadata();
let pipeline = sharp(SRC).ensureAlpha();

if (!meta.hasAlpha) {
  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    const keyed = alphaForPixel(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = Math.min(data[i + 3], keyed);
  }
  pipeline = sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
  console.log("Keyed white/checker matte → alpha");
} else {
  console.log("Source already has alpha — preserving");
}

await pipeline.trim({ threshold: 10 }).png({ compressionLevel: 9 }).toFile(OUT);

const ICON_SIZES = [
  ["favicon-32.png", 32],
  ["solanawsop-icon.png", 192],
  ["solanawsop-icon-192.png", 192],
  ["solanawsop-icon-512.png", 512],
];
for (const [dest, size] of ICON_SIZES) {
  await sharp(OUT).resize(size, size).png().toFile(join(BRAND, dest));
}

const outMeta = await sharp(OUT).metadata();
console.log(`✓ ${outMeta.width}×${outMeta.height} → public/assets/brand/solanawsop-chip.png`);
