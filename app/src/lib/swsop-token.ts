import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import { TOKEN_DECIMALS } from "./constants";
import { vaultPda } from "./pdas";

/** Pump.fun mint — set `NEXT_PUBLIC_SWSOP_MINT` after launch. */
export function getSwspMint(): PublicKey | null {
  const raw = process.env.NEXT_PUBLIC_SWSOP_MINT?.trim();
  if (!raw) return null;
  try {
    return new PublicKey(raw);
  } catch {
    return null;
  }
}

export function requireSwspMint(): PublicKey {
  const mint = getSwspMint();
  if (!mint) {
    throw new Error(
      "NEXT_PUBLIC_SWSOP_MINT is not set — add your pump.fun mint address to env and redeploy."
    );
  }
  return mint;
}

export function tierBuyInRaw(humanAmount: number): bigint {
  return BigInt(humanAmount) * BigInt(10 ** TOKEN_DECIMALS);
}

export function playerTokenAta(wallet: PublicKey, mint?: PublicKey): PublicKey {
  const m = mint ?? requireSwspMint();
  return getAssociatedTokenAddressSync(m, wallet);
}

export function vaultTokenAta(room: PublicKey, mint?: PublicKey): PublicKey {
  const m = mint ?? requireSwspMint();
  const [vault] = vaultPda(room);
  return getAssociatedTokenAddressSync(m, vault, true);
}

export function feeRecipientTokenAta(
  authority: PublicKey,
  mint?: PublicKey
): PublicKey {
  return playerTokenAta(authority, mint);
}

/** Read swsop_mint from on-chain GlobalConfig account data. */
export function mintFromConfigData(data: Buffer): PublicKey | null {
  if (data.length < 72) return null;
  const mint = new PublicKey(data.subarray(40, 72));
  if (mint.equals(PublicKey.default)) return null;
  return mint;
}

export async function ensurePlayerTokenAta(
  connection: Connection,
  payer: PublicKey,
  owner: PublicKey,
  mint?: PublicKey
): Promise<{ ata: PublicKey; instructions: TransactionInstruction[] }> {
  const m = mint ?? requireSwspMint();
  const ata = playerTokenAta(owner, m);
  const info = await connection.getAccountInfo(ata);
  if (info) return { ata, instructions: [] };
  return {
    ata,
    instructions: [
      createAssociatedTokenAccountIdempotentInstruction(
        payer,
        ata,
        owner,
        m,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      ),
    ],
  };
}

export async function fetchTokenBalance(
  connection: Connection,
  wallet: PublicKey,
  mint?: PublicKey
): Promise<bigint> {
  const m = mint ?? requireSwspMint();
  try {
    const ata = playerTokenAta(wallet, m);
    const bal = await connection.getTokenAccountBalance(ata);
    return BigInt(bal.value.amount);
  } catch {
    return BigInt(0);
  }
}
