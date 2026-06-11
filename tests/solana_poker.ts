import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("solana_poker", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.SolanaPoker as Program;
  const authority = provider.wallet as anchor.Wallet;

  const configPda = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    program.programId
  )[0];

  function roomPda(tier: number) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("room"), Buffer.from([tier])],
      program.programId
    )[0];
  }

  function vaultPda(room: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), room.toBuffer()],
      program.programId
    )[0];
  }

  function playerPda(room: PublicKey, wallet: PublicKey) {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("player"), room.toBuffer(), wallet.toBuffer()],
      program.programId
    )[0];
  }

  it("initializes config and room", async () => {
    const configInfo = await provider.connection.getAccountInfo(configPda);
    if (!configInfo) {
      await program.methods
        .initializeConfig()
        .accounts({
          config: configPda,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    const room = roomPda(0);
    const vault = vaultPda(room);
    const roomInfo = await provider.connection.getAccountInfo(room);
    if (!roomInfo) {
      await program.methods
        .initializeRoom(0)
        .accounts({
          config: configPda,
          room,
          vault,
          authority: authority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
    }

    const account = await program.account.room.fetch(room);
    expect(account.buyIn.toNumber()).to.equal(0.05 * LAMPORTS_PER_SOL);
    expect(account.playerCount).to.equal(0);
  });

  it("joins a room with buy-in", async () => {
    const room = roomPda(0);
    const vault = vaultPda(room);
    const player = playerPda(room, authority.publicKey);

    const playerInfo = await provider.connection.getAccountInfo(player);
    if (playerInfo) {
      // already joined from prior run
      return;
    }

    await program.methods
      .joinRoom()
      .accounts({
        room,
        player,
        playerWallet: authority.publicKey,
        vault,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const playerAccount = await program.account.player.fetch(player);
    expect(playerAccount.stack.toNumber()).to.equal(0.05 * LAMPORTS_PER_SOL);
  });
});
