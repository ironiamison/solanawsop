"use client";

import { useCallback, useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { decodePlayer, decodeRoom, isEmptySeat } from "@/lib/decode";
import { playerPda, roomPda } from "@/lib/pdas";
import { PlayerState, RoomState } from "@/lib/types";

async function loadRoom(
  connection: Connection,
  roomPk: PublicKey
): Promise<{ room: RoomState; players: PlayerState[] } | null> {
  const roomInfo = await connection.getAccountInfo(roomPk);
  if (!roomInfo) return null;

  const roomData = decodeRoom(roomPk, Buffer.from(roomInfo.data));
  const playerAccounts = await Promise.all(
    roomData.seats
      .filter((s) => !isEmptySeat(s))
      .map(async (wallet) => {
        const [pk] = playerPda(roomPk, wallet);
        const info = await connection.getAccountInfo(pk);
        if (!info) return null;
        return decodePlayer(pk, Buffer.from(info.data));
      })
  );

  return {
    room: roomData,
    players: playerAccounts.filter((p): p is PlayerState => p !== null),
  };
}

export function useRoomByPubkey(
  connection: Connection,
  roomPubkey: string | null
) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [players, setPlayers] = useState<PlayerState[]>([]);
  const [loading, setLoading] = useState(!!roomPubkey);
  const [initialLoadDone, setInitialLoadDone] = useState(!roomPubkey);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!roomPubkey) {
        setRoom(null);
        setPlayers([]);
        setLoading(false);
        setInitialLoadDone(true);
        return;
      }

      if (!opts?.silent) setLoading(true);
      setError(null);
      try {
        const result = await loadRoom(connection, new PublicKey(roomPubkey));
        if (!result) {
          setRoom(null);
          setPlayers([]);
        } else {
          setRoom(result.room);
          setPlayers(result.players);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load room");
      } finally {
        setLoading(false);
        setInitialLoadDone(true);
      }
    },
    [connection, roomPubkey]
  );

  useEffect(() => {
    setInitialLoadDone(false);
    setLoading(!!roomPubkey);
    refresh();
    const id = setInterval(() => refresh({ silent: true }), 1500);
    return () => clearInterval(id);
  }, [refresh]);

  useEffect(() => {
    if (!roomPubkey) return;
    const pk = new PublicKey(roomPubkey);
    const sub = connection.onAccountChange(pk, () => {
      refresh({ silent: true });
    });
    return () => {
      connection.removeAccountChangeListener(sub);
    };
  }, [connection, roomPubkey, refresh]);

  return { room, players, loading, initialLoadDone, error, refresh };
}

export function useRoom(connection: Connection, tierIndex: number | null) {
  const roomPubkey =
    tierIndex !== null ? roomPda(tierIndex)[0].toBase58() : null;
  return useRoomByPubkey(connection, roomPubkey);
}

export function getMyPlayer(
  players: PlayerState[],
  wallet?: PublicKey
): PlayerState | undefined {
  if (!wallet) return undefined;
  return players.find((p) => p.wallet.equals(wallet));
}

export function getPlayerPubkeys(players: PlayerState[]): PublicKey[] {
  return players.map((p) => p.pubkey);
}
