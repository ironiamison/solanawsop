"use client";

import { useMemo } from "react";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  PublicKey,
  Transaction,
  VersionedTransaction,
  type Connection,
} from "@solana/web3.js";
import { usePrivy } from "@privy-io/react-auth";
import {
  useSignTransaction,
  useWallets,
} from "@privy-io/react-auth/solana";
import { getProgram, SolanaPokerProgram } from "@/lib/program";
import { getSolanaConnection } from "@/lib/solana-connection";

export function usePokerProgram(): {
  program: SolanaPokerProgram | null;
  connection: Connection;
  publicKey: PublicKey | null;
  walletAddress: string | null;
  ready: boolean;
  authenticated: boolean;
} {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { signTransaction } = useSignTransaction();

  const connection = useMemo(() => getSolanaConnection(), []);

  const solanaWallet = wallets[0] ?? null;
  const walletAddress = solanaWallet?.address ?? null;

  const publicKey = useMemo(() => {
    if (!walletAddress) return null;
    try {
      return new PublicKey(walletAddress);
    } catch {
      return null;
    }
  }, [walletAddress]);

  const program = useMemo(() => {
    if (!authenticated || !solanaWallet || !publicKey) return null;

    const provider = new AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction: async <T extends Transaction | VersionedTransaction>(
          tx: T
        ): Promise<T> => {
          const isVersioned = tx instanceof VersionedTransaction;
          const serialized = isVersioned
            ? tx.serialize()
            : tx.serialize({
                requireAllSignatures: false,
                verifySignatures: false,
              });

          const output = await signTransaction({
            transaction: serialized,
            wallet: solanaWallet,
          });
          const signedBytes = (
            Array.isArray(output) ? output[0] : output
          ).signedTransaction;

          if (isVersioned) {
            return VersionedTransaction.deserialize(signedBytes) as T;
          }
          return Transaction.from(signedBytes) as T;
        },
        signAllTransactions: async <T extends Transaction | VersionedTransaction>(
          txs: T[]
        ): Promise<T[]> => {
          const signed: T[] = [];
          for (const tx of txs) {
            const isVersioned = tx instanceof VersionedTransaction;
            const serialized = isVersioned
              ? tx.serialize()
              : tx.serialize({
                  requireAllSignatures: false,
                  verifySignatures: false,
                });
            const output = await signTransaction({
              transaction: serialized,
              wallet: solanaWallet,
            });
            const signedBytes = (
              Array.isArray(output) ? output[0] : output
            ).signedTransaction;
            signed.push(
              (isVersioned
                ? VersionedTransaction.deserialize(signedBytes)
                : Transaction.from(signedBytes)) as T
            );
          }
          return signed;
        },
      },
      { commitment: "confirmed" }
    );

    try {
      return getProgram(provider);
    } catch (e) {
      console.error("Failed to initialize Anchor program:", e);
      return null;
    }
  }, [authenticated, connection, publicKey, signTransaction, solanaWallet]);

  return {
    program,
    connection,
    publicKey,
    walletAddress,
    ready,
    authenticated,
  };
}
