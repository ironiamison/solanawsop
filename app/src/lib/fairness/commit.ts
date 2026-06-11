import { createHash } from "crypto";
import { PublicKey } from "@solana/web3.js";

/** Matches `deck_commitment` in programs/solana_poker/src/game_logic.rs */
export function deckCommitment(deck: number[], vrfSeed: Uint8Array): Buffer {
  const deckHash = createHash("sha256").update(Buffer.from(deck)).digest();
  return createHash("sha256")
    .update(Buffer.concat([deckHash, Buffer.from(vrfSeed)]))
    .digest();
}

export function holeCardSalt(
  vrfSeed: Uint8Array,
  seat: number,
  cardIndex: number
): bigint {
  const h = createHash("sha256")
    .update(Buffer.concat([Buffer.from(vrfSeed), Buffer.from([seat, cardIndex])]))
    .digest();
  return h.readBigUInt64LE(0);
}

export function holeCardCommitment(
  card: number,
  salt: bigint,
  wallet: PublicKey,
  handNumber: bigint
): Buffer {
  const saltBuf = Buffer.alloc(8);
  saltBuf.writeBigUInt64LE(salt);
  const handBuf = Buffer.alloc(8);
  handBuf.writeBigUInt64LE(handNumber);
  return createHash("sha256")
    .update(
      Buffer.concat([
        Buffer.from([card]),
        saltBuf,
        wallet.toBuffer(),
        handBuf,
      ])
    )
    .digest();
}
