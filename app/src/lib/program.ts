import { AnchorProvider, BN, Idl, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import idlJson from "@/idl/solana_poker.json";
import { PROGRAM_ID } from "./constants";
import {
  configPda,
  playerPda,
  privateRoomPda,
  roomPda,
  vaultPda,
} from "./pdas";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SolanaPokerProgram = Program<any>;

export function getProgram(provider: AnchorProvider): SolanaPokerProgram {
  return new Program(idlJson as Idl, provider) as SolanaPokerProgram;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function methods(program: SolanaPokerProgram): any {
  return program.methods;
}

async function rakeAccounts(program: SolanaPokerProgram, room: PublicKey) {
  const [vault] = vaultPda(room);
  const [config] = configPda();
  const configInfo = await program.provider.connection.getAccountInfo(config);
  if (!configInfo) {
    throw new Error("Program config not initialized");
  }
  const feeRecipient = new PublicKey(configInfo.data.subarray(8, 40));
  return {
    vault,
    config,
    feeRecipient,
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

export async function initializeRoom(
  program: SolanaPokerProgram,
  authority: PublicKey,
  tierIndex: number
) {
  const [config] = configPda();
  const [room] = roomPda(tierIndex);
  const [vault] = vaultPda(room);
  return methods(program)
    .initializeRoom(tierIndex)
    .accounts({
      config,
      room,
      vault,
      authority,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

export async function createPrivateTable(
  program: SolanaPokerProgram,
  creator: PublicKey,
  buyInLamports: number,
  tableId: bigint
) {
  const [room] = privateRoomPda(creator, tableId);
  const [vault] = vaultPda(room);
  return methods(program)
    .createPrivateTable(new BN(buyInLamports), new BN(tableId.toString()))
    .accounts({
      room,
      vault,
      creator,
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
  const [player] = playerPda(room, wallet);
  const [vault] = vaultPda(room);
  return methods(program)
    .joinRoom()
    .accounts({
      room,
      player,
      playerWallet: wallet,
      vault,
      systemProgram: SystemProgram.programId,
    })
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
  const [vault] = vaultPda(room);
  return methods(program)
    .leaveRoom()
    .accounts({
      room,
      player,
      playerWallet: wallet,
      vault,
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

export async function startHandByRoom(
  program: SolanaPokerProgram,
  wallet: PublicKey,
  room: PublicKey,
  playerPubkeys: PublicKey[]
) {
  return methods(program)
    .startHand()
    .accounts({ room, starter: wallet })
    .remainingAccounts(
      playerPubkeys.map((pk) => ({
        pubkey: pk,
        isWritable: true,
        isSigner: false,
      }))
    )
    .rpc();
}

export async function startHand(
  program: SolanaPokerProgram,
  wallet: PublicKey,
  tierIndex: number,
  playerPubkeys: PublicKey[]
) {
  const [room] = roomPda(tierIndex);
  return startHandByRoom(program, wallet, room, playerPubkeys);
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
  allPlayerPubkeys: PublicKey[]
) {
  const [player] = playerPda(room, wallet);
  const { vault, config, feeRecipient } = await rakeAccounts(program, room);
  return methods(program)
    .playerAction(action)
    .accounts({
      room,
      player,
      playerWallet: wallet,
      vault,
      config,
      feeRecipient,
    })
    .remainingAccounts(
      allPlayerPubkeys.map((pk) => ({
        pubkey: pk,
        isWritable: true,
        isSigner: false,
      }))
    )
    .rpc();
}

export async function playerAction(
  program: SolanaPokerProgram,
  wallet: PublicKey,
  tierIndex: number,
  action: PokerMoveArg,
  allPlayerPubkeys: PublicKey[]
) {
  const [room] = roomPda(tierIndex);
  return playerActionByRoom(
    program,
    wallet,
    room,
    action,
    allPlayerPubkeys
  );
}

export async function advanceStreetByRoom(
  program: SolanaPokerProgram,
  room: PublicKey,
  allPlayerPubkeys: PublicKey[]
) {
  const { vault, config, feeRecipient } = await rakeAccounts(program, room);
  return methods(program)
    .advanceStreet()
    .accounts({ room, vault, config, feeRecipient })
    .remainingAccounts(
      allPlayerPubkeys.map((pk) => ({
        pubkey: pk,
        isWritable: true,
        isSigner: false,
      }))
    )
    .rpc();
}

export async function advanceStreet(
  program: SolanaPokerProgram,
  tierIndex: number,
  allPlayerPubkeys: PublicKey[]
) {
  const [room] = roomPda(tierIndex);
  return advanceStreetByRoom(program, room, allPlayerPubkeys);
}

export async function setupAllRooms(
  program: SolanaPokerProgram,
  authority: PublicKey
) {
  const connection = program.provider.connection;
  const [config] = configPda();
  const configInfo = await connection.getAccountInfo(config);

  if (!configInfo) {
    await initializeConfig(program, authority);
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
