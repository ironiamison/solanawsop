#!/usr/bin/env node
/**
 * Lobby asset helper — NEVER overwrites existing PNGs.
 *
 * Manual workflow:
 *   1. Drop your art into public/assets/lobby/ (see filenames below)
 *   2. npm run process-assets   (strips black matte from 3D renders only)
 *
 * Optional: REPLICATE_API_TOKEN=... node scripts/generate-lobby-assets.mjs
 *           (only fills in files that are missing)
 */

import { access, mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../public/assets/lobby");

const PROMPTS = {
  "ace-spades-3d.png":
    "3D product render Ace of Spades playing card, white card black spade, purple neon edge glow, floating angle, pure black background, casino game UI asset",
  "king-hearts-3d.png":
    "3D product render King of Hearts playing card, white card red hearts, purple neon edge glow, floating angle, pure black background, casino game UI asset",
  "chip-stack-3d.png":
    "3D stack of four purple casino poker chips, metallic violet, neon glow, pure black background, game UI asset",
  "chips-floating-3d.png":
    "3D two purple poker chips floating, metallic violet casino chips, pure black background, game UI asset",
  "poker-table-topdown-3d.png":
    "3D top-down casino poker table green felt oval dark wood rail, six seat positions, pure black background, game UI asset",
  "trophy-3d.png":
    "3D golden championship poker trophy cup purple neon glow, pure black background, game UI asset",
};

async function exists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function viaReplicate(filename, prompt) {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return false;

  const dest = join(OUT, filename);
  if (await exists(dest)) {
    console.log("skip (exists):", filename);
    return true;
  }

  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      input: { prompt, width: 512, height: 512, refine: "expert_ensemble_refiner" },
    }),
  });

  if (!res.ok) {
    console.error("Replicate error:", await res.text());
    return false;
  }

  const data = await res.json();
  const url = data.output?.[0] ?? data.output;
  if (!url) return false;

  const img = await fetch(url);
  const buf = Buffer.from(await img.arrayBuffer());
  await writeFile(dest, buf);
  console.log("Wrote", filename);
  return true;
}

await mkdir(OUT, { recursive: true });

const token = process.env.REPLICATE_API_TOKEN;
if (!token) {
  const present = [];
  const missing = [];
  for (const f of Object.keys(PROMPTS)) {
    if (await exists(join(OUT, f))) present.push(f);
    else missing.push(f);
  }

  console.log(`
Lobby assets — manual / IDE workflow
====================================
Place PNGs in: public/assets/lobby/

Present (${present.length}):
${present.map((f) => `  ✓ ${f}`).join("\n") || "  (none)"}

Missing (${missing.length}):
${missing.map((f) => `  • ${f}`).join("\n") || "  (none)"}

Also required (user-provided, never auto-generated):
  • penthouse-bg.png
  • demo-join-bg.png
  • demo-join-chips.png

After adding/replacing 3D PNGs:  npm run process-assets

This script never overwrites existing files.
Optional: set REPLICATE_API_TOKEN to fill only missing 3D assets via SDXL.
`);
  process.exit(missing.length ? 0 : 0);
}

for (const [file, prompt] of Object.entries(PROMPTS)) {
  await viaReplicate(file, prompt);
}

console.log("Done.");
