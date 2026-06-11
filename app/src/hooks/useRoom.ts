"use client";

import { useCallback, useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { decodePlayer, decodeRoom, isEmptySeat } from "@/lib/decode";
import { getCachedHoleCards } from "@/lib/fairness/events";
import { playerPda, roomPda } from "@/lib/pdas";
import { PlayerState, RoomState } from "@/lib/types";

function applyHoleCardCache(
  room: RoomState,
  players: PlayerState[]
): PlayerState[] {
  const hand = room.handNumber ?? 0;
  if (!hand || room.phase === "waiting") return players;
  const roomKey = room.pubkey.toBase58();
  return players.map((p) => {
    if (p.holeRevealed && p.holeCards[0] !== 255) return p;
    const cached = getCachedHoleCards(roomKey, hand, p.wallet.toBase58());
    if (cached) return { ...p, holeCards: [...cached] };
    return p;
  });
}

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

  const players = playerAccounts.filter((p): p is PlayerState => p !== null);
  return {
    room: roomData,
    players: applyHoleCardCache(roomData, players),
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
