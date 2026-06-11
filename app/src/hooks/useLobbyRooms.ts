"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { BUY_IN_TIERS } from "@/lib/constants";
import { decodeRoom } from "@/lib/decode";
import { roomPda } from "@/lib/pdas";
import { GamePhase } from "@/lib/types";
import { usePokerProgram } from "@/hooks/usePokerProgram";

export interface LobbyRoom {
  tierIndex: number;
  label: string;
  pubkey: PublicKey;
  playerCount: number;
  phase: GamePhase;
  pot: number;
  exists: boolean;
}

const ROOM_FETCH_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export function useLobbyRooms() {
  const { connection } = usePokerProgram();
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent && !initialLoadDone.current) {
        setLoading(true);
      }

      const emptyTier = (tier: (typeof BUY_IN_TIERS)[number], pk: PublicKey): LobbyRoom => ({
        tierIndex: tier.index,
        label: tier.label,
        pubkey: pk,
        playerCount: 0,
        phase: "waiting" as GamePhase,
        pot: 0,
        exists: false,
      });

      try {
        const results = await Promise.all(
          BUY_IN_TIERS.map(async (tier) => {
            const [pk] = roomPda(tier.index);
            try {
              const info = await withTimeout(
                connection.getAccountInfo(pk),
                ROOM_FETCH_TIMEOUT_MS,
                null
              );
              if (!info) {
                return emptyTier(tier, pk);
              }
              const room = decodeRoom(pk, Buffer.from(info.data));
              return {
                tierIndex: tier.index,
                label: tier.label,
                pubkey: pk,
                playerCount: room.playerCount,
                phase: room.phase,
                pot: room.pot,
                exists: true,
              };
            } catch {
              return emptyTier(tier, pk);
            }
          })
        );
        setRooms(results);
      } finally {
        initialLoadDone.current = true;
        setLoading(false);
      }
    },
    [connection]
  );

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh({ silent: true }), 4000);
    return () => clearInterval(id);
  }, [refresh]);

  const onlinePlayers = rooms.reduce((n, r) => n + r.playerCount, 0);
  const activeTables = rooms.filter(
    (r) => r.playerCount > 0 || r.phase !== "waiting"
  ).length;

  const bestRoom =
    [...rooms]
      .filter((r) => r.playerCount < 6)
      .sort((a, b) => b.playerCount - a.playerCount)[0] ?? rooms[0];

  return { rooms, loading, onlinePlayers, activeTables, bestRoom, refresh };
}
