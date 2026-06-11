import { AnchorProvider, BN, Idl, Program } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_SLOT_HASHES_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import idlJson from "@/idl/solana_poker.json";
import { PROGRAM_ID } from "./constants";
import {
  configPda,
  handPda,
  playerPda,
  privateRoomPda,
  roomPda,
  vaultPda,
} from "./pdas";
import {
  ensurePlayerTokenAta,
  feeRecipientTokenAta,
  getSwspMint,
  mintFromConfigData,
  requireSwspMint,
  vaultTokenAta,
} from "./swsop-token";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SolanaPokerProgram = Program<any>;

export function getProgram(provider: AnchorProvider): SolanaPokerProgram {
  return new Program(idlJson as Idl, provider) as SolanaPokerProgram;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function methods(program: SolanaPokerProgram): any {
  return program.methods;
}

async function resolveMint(
  program: SolanaPokerProgram
): Promise<PublicKey> {
  const [config] = configPda();
  const configInfo = await program.provider.connection.getAccountInfo(config);
  if (configInfo) {
    const onChain = mintFromConfigData(Buffer.from(configInfo.data));
    if (onChain) return onChain;
  }
  return requireSwspMint();
}

async function tokenEscrowAccounts(
  program: SolanaPokerProgram,
  room: PublicKey
) {
  const [config] = configPda();
  const configInfo = await program.provider.connection.getAccountInfo(config);
  if (!configInfo) {
    throw new Error("Program config not initialized");
  }
  const feeRecipient = new PublicKey(configInfo.data.subarray(8, 40));
  const mint = await resolveMint(program);
  const [vault] = vaultPda(room);
  return {
    vault,
    vaultTokenAccount: vaultTokenAta(room, mint),
    config,
    feeRecipientTokenAccount: feeRecipientTokenAta(feeRecipient, mint),
    mint,
    tokenProgram: TOKEN_PROGRAM_ID,
  };
}

export async function initializeConfig(
  program: SolanaPokerProgram,
  authority: PublicKey
) {
  const [config] = configPda();
  return methods(program)
    .initializeConfig()
    .accounts({
      config,
      authority,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function configureMint(
  program: SolanaPokerProgram,
  authority: PublicKey,
  mint: PublicKey
) {
  const [config] = configPda();
  return methods(program)
    .configureMint(mint)
    .accounts({
      config,
      authority,
    })
    .rpc();
}

export async function initializeRoom(
  program: SolanaPokerProgram,
  authority: PublicKey,
  tierIndex: number
) {
  const mint = await resolveMint(program);
  const [config] = configPda();
  const [room] = roomPda(tierIndex);
  const [vault] = vaultPda(room);
  const vaultTokenAccount = vaultTokenAta(room, mint);
  return methods(program)
    .initializeRoom(tierIndex)
    .accounts({
      config,
      room,
      vault,
      mint,
      vaultTokenAccount,
      authority,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function createPrivateTable(
  program: SolanaPokerProgram,
  creator: PublicKey,
  buyInRaw: number,
  tableId: bigint
) {
  const mint = await resolveMint(program);
  const [config] = configPda();
  const [room] = privateRoomPda(creator, tableId);
  const [vault] = vaultPda(room);
  const vaultTokenAccount = vaultTokenAta(room, mint);
  return methods(program)
    .createPrivateTable(new BN(buyInRaw), new BN(tableId.toString()))
    .accounts({
      config,
      room,
      vault,
      mint,
      vaultTokenAccount,
      creator,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function invitePlayer(
  program: SolanaPokerProgram,
  creator: PublicKey,
  room: PublicKey,
  invitee: PublicKey
) {
  return methods(program)
    .invitePlayer(invitee)
    .accounts({
      room,
      creator,
    })
    .rpc();
}

export async function joinRoomByPubkey(
  program: SolanaPokerProgram,
  wallet: PublicKey,
  room: PublicKey
) {
  const connection = program.provider.connection;
  const [player] = playerPda(room, wallet);
  const { vault, vaultTokenAccount, config, mint } =
    await tokenEscrowAccounts(program, room);
  const { ata: playerTokenAccount, instructions: preIx } =
    await ensurePlayerTokenAta(connection, wallet, wallet, mint);

  return methods(program)
    .joinRoom()
    .accounts({
      config,
      room,
      player,
      playerWallet: wallet,
      mint,
      playerTokenAccount,
      vaultTokenAccount,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .preInstructions(preIx)
    .rpc();
}

export async function joinRoom(
  program: SolanaPokerProgram,
  wallet: PublicKey,
  tierIndex: number
) {
  const [room] = roomPda(tierIndex);
  return joinRoomByPubkey(program, wallet, room);
}

export async function leaveRoomByPubkey(
  program: SolanaPokerProgram,
  wallet: PublicKey,
  room: PublicKey
) {
  const [player] = playerPda(room, wallet);
  const { vault, vaultTokenAccount, mint } = await tokenEscrowAccounts(
    program,
    room
  );
  const playerTokenAccount = (
    await ensurePlayerTokenAta(
      program.provider.connection,
      wallet,
      wallet,
      mint
    )
  ).ata;

  return methods(program)
    .leaveRoom()
    .accounts({
      room,
      player,
      playerWallet: wallet,
      playerTokenAccount,
      vaultTokenAccount,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}

export async function leaveRoom(
  program: SolanaPokerProgram,
  wallet: PublicKey,
  tierIndex: number
) {
  const [room] = roomPda(tierIndex);
  return leaveRoomByPubkey(program, wallet, room);
}

function remainingWithHandState(
  room: PublicKey,
  handNumber: number,
  playerPubkeys: PublicKey[]
) {
  const [handState] = handPda(room, handNumber);
  return [
    ...playerPubkeys.map((pk) => ({
      pubkey: pk,
      isWritable: true,
      isSigner: false,
    })),
    { pubkey: handState, isWritable: false, isSigner: false },
  ];
}

export async function startHandByRoom(
  program: SolanaPokerProgram,
  wallet: PublicKey,
  room: PublicKey,
  playerPubkeys: PublicKey[],
  nextHand: number
) {
  const [handState] = handPda(room, nextHand);
  return methods(program)
    .startHand(new BN(nextHand))
    .accounts({
      room,
      handState,
      slotHashes: SYSVAR_SLOT_HASHES_PUBKEY,
      starter: wallet,
      systemProgram: SystemProgram.programId,
    })
    .remainingAccounts(
      playerPubkeys.map((pk) => ({
        pubkey: pk,
        isWritable: true,
        isSigner: false,
      }))
    )
    .rpc();
}

export async function revealHoleCardsByRoom(
  program: SolanaPokerProgram,
  wallet: PublicKey,
  room: PublicKey,
  handNumber: number
) {
  const [handState] = handPda(room, handNumber);
  const [player] = playerPda(room, wallet);
  return methods(program)
    .revealHoleCards()
    .accounts({
      room,
      handState,
      player,
      playerWallet: wallet,
    })
    .rpc();
}

export async function startHand(
  program: SolanaPokerProgram,
  wallet: PublicKey,
  tierIndex: number,
  playerPubkeys: PublicKey[],
  nextHand: number
) {
  const [room] = roomPda(tierIndex);
  return startHandByRoom(program, wallet, room, playerPubkeys, nextHand);
}

export type PokerMoveArg =
  | { fold: {} }
  | { check: {} }
  | { call: {} }
  | { raise: { amount: BN } };

export async function playerActionByRoom(
  program: SolanaPokerProgram,
  wallet: PublicKey,
  room: PublicKey,
  action: PokerMoveArg,
  allPlayerPubkeys: PublicKey[],
  handNumber: number
) {
  const [player] = playerPda(room, wallet);
  const {
    vault,
    vaultTokenAccount,
    config,
    feeRecipientTokenAccount,
    tokenProgram,
  } = await tokenEscrowAccounts(program, room);
  return methods(program)
    .playerAction(action)
    .accounts({
      room,
      player,
      playerWallet: wallet,
      config,
      vaultTokenAccount,
      vault,
      feeRecipientTokenAccount,
      tokenProgram,
    })
    .remainingAccounts(
      remainingWithHandState(room, handNumber, allPlayerPubkeys)
    )
    .rpc();
}

export async function playerAction(
  program: SolanaPokerProgram,
  wallet: PublicKey,
  tierIndex: number,
  action: PokerMoveArg,
  allPlayerPubkeys: PublicKey[],
  handNumber: number
) {
  const [room] = roomPda(tierIndex);
  return playerActionByRoom(
    program,
    wallet,
    room,
    action,
    allPlayerPubkeys,
    handNumber
  );
}

export async function advanceStreetByRoom(
  program: SolanaPokerProgram,
  room: PublicKey,
  allPlayerPubkeys: PublicKey[],
  handNumber: number
) {
  const {
    vault,
    vaultTokenAccount,
    config,
    feeRecipientTokenAccount,
    tokenProgram,
  } = await tokenEscrowAccounts(program, room);
  return methods(program)
    .advanceStreet()
    .accounts({
      room,
      config,
      vaultTokenAccount,
      vault,
      feeRecipientTokenAccount,
      tokenProgram,
    })
    .remainingAccounts(
      remainingWithHandState(room, handNumber, allPlayerPubkeys)
    )
    .rpc();
}

export async function advanceStreet(
  program: SolanaPokerProgram,
  tierIndex: number,
  allPlayerPubkeys: PublicKey[],
  handNumber: number
) {
  const [room] = roomPda(tierIndex);
  return advanceStreetByRoom(program, room, allPlayerPubkeys, handNumber);
}

/** One-time devnet/mainnet setup after pump.fun mint is live. */
export async function setupAllRooms(
  program: SolanaPokerProgram,
  authority: PublicKey
) {
  const connection = program.provider.connection;
  const mint = getSwspMint();
  if (!mint) {
    throw new Error(
      "Set NEXT_PUBLIC_SWSOP_MINT to your pump.fun token mint before initializing tables."
    );
  }

  const [config] = configPda();
  let configInfo = await connection.getAccountInfo(config);

  if (!configInfo) {
    await initializeConfig(program, authority);
    configInfo = await connection.getAccountInfo(config);
  }
  if (!configInfo) {
    throw new Error("Failed to initialize program config");
  }

  const configuredMint = mintFromConfigData(Buffer.from(configInfo.data));
  if (!configuredMint) {
    await configureMint(program, authority, mint);
  }

  const { instructions: feeAtaIx } = await ensurePlayerTokenAta(
    connection,
    authority,
    authority,
    mint
  );
  if (feeAtaIx.length > 0) {
    const send = program.provider.sendAndConfirm;
    if (!send) {
      throw new Error("Connect wallet to create fee recipient token account");
    }
    const tx = new Transaction().add(...feeAtaIx);
    await send.call(program.provider, tx);
  }

  let lastSig = "already-initialized";
  for (let i = 0; i < 5; i++) {
    const [room] = roomPda(i);
    const roomInfo = await connection.getAccountInfo(room);
    if (!roomInfo) {
      lastSig = await initializeRoom(program, authority, i);
    }
  }
  return lastSig;
}

export { PROGRAM_ID };
