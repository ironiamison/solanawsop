import { PublicKey } from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";

export function configPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
}

export function roomPda(tierIndex: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("room"), Buffer.from([tierIndex])],
    PROGRAM_ID
  );
}

export function vaultPda(room: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), room.toBuffer()],
    PROGRAM_ID
  );
}

export function handPda(
  room: PublicKey,
  handNumber: number | bigint
): [PublicKey, number] {
  const handBuf = Buffer.alloc(8);
  handBuf.writeBigUInt64LE(BigInt(handNumber));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("hand"), room.toBuffer(), handBuf],
    PROGRAM_ID
  );
}

export function playerPda(room: PublicKey, wallet: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("player"), room.toBuffer(), wallet.toBuffer()],
    PROGRAM_ID
  );
}

export function privateRoomPda(
  creator: PublicKey,
  tableId: bigint
): [PublicKey, number] {
  const idBuf = Buffer.alloc(8);
  idBuf.writeBigUInt64LE(tableId);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("private_room"), creator.toBuffer(), idBuf],
    PROGRAM_ID
  );
}
