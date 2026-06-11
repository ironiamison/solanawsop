/** Matches `shuffle_deck` in programs/solana_poker/src/game_logic.rs */

export function initDeck(): number[] {
  return Array.from({ length: 52 }, (_, i) => i);
}

const LCG_MULT = BigInt("6364136223846793005");

export function shuffleDeck(deck: number[], seed: bigint, slot: bigint): number[] {
  const out = [...deck];
  let state = seed * LCG_MULT + slot;
  for (let i = 51; i >= 1; i--) {
    state = state * LCG_MULT + BigInt(1);
    const j = Number(state % BigInt(i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Recompute shuffle from on-chain `game_seed` + slot at deal time. */
export function deckFromOnChainSeed(
  gameSeed: bigint,
  slot: bigint
): number[] {
  return shuffleDeck(initDeck(), gameSeed, slot);
}

/** First 8 bytes of vrf seed → `game_seed` on Room (matches on-chain). */
export function gameSeedFromVrf(vrfSeed: Uint8Array): bigint {
  const buf = Buffer.from(vrfSeed);
  return buf.readBigUInt64LE(0);
}
