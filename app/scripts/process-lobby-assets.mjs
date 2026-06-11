#!/usr/bin/env node
/**
 * Strip black matte from lobby 3D PNGs → real alpha transparency.
 * Only touches 3D game assets — never photos (penthouse, demo join, etc.).
 *
 * Run: npm run process-assets
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(__dirname, "../public/assets/lobby");

const THREE_D_ASSETS = [
  "ace-spades-3d.png",
  "king-hearts-3d.png",
  "chip-stack-3d.png",
  "chips-floating-3d.png",
  "poker-table-topdown-3d.png",
  "trophy-3d.png",
];

/** Aggressive key for AI renders with dark purple/black matte */
const HARD = 72;
const SOFT = 108;

function alphaForPixel(r, g, b) {
  const max = Math.max(r, g, b);
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  if (max <= HARD) return 0;
  if (max <= SOFT) return Math.round(((max - HARD) / (SOFT - HARD)) * 255);

  // Dark fringe / matte spill (incl. purple-tinted blacks)
  if (luma < 88) {
    const fringe = Math.round(((luma - 48) / 40) * 255);
    return Math.max(0, Math.min(255, fringe));
  }

  return 255;
}

async function processFile(filename) {
  const path = join(DIR, filename);
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });

  for (let i = 0; i < data.length; i += 4) {
    const keyed = alphaForPixel(data[i], data[i + 1], data[i + 2]);
    data[i + 3] = Math.min(data[i + 3], keyed);
  }

  const keyed = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  await sharp(keyed).trim({ threshold: 12 }).png({ compressionLevel: 9 }).toFile(path);

  const trimmed = await sharp(path).metadata();
  console.log("✓", filename, `${trimmed.width}×${trimmed.height}`);
}

for (const f of THREE_D_ASSETS) {
  await processFile(f);
}
console.log(`Processed ${THREE_D_ASSETS.length} 3D assets (photos skipped).`);
