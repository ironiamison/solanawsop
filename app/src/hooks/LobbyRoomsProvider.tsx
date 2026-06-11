"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { PublicKey } from "@solana/web3.js";
import { BUY_IN_TIERS } from "@/lib/constants";
import { decodeRoom } from "@/lib/decode";
import { getSolanaConnection } from "@/lib/solana-connection";
import { roomPda } from "@/lib/pdas";
import { GamePhase } from "@/lib/types";

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
const ROOM_POLL_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

type LobbyRoomsContextValue = {
  rooms: LobbyRoom[];
  loading: boolean;
  onlinePlayers: number;
  activeTables: number;
  bestRoom: LobbyRoom | undefined;
  refresh: (opts?: { silent?: boolean }) => Promise<void>;
};

const LobbyRoomsContext = createContext<LobbyRoomsContextValue | null>(null);

function emptyTier(tier: (typeof BUY_IN_TIERS)[number], pk: PublicKey): LobbyRoom {
  return {
    tierIndex: tier.index,
    label: tier.label,
    pubkey: pk,
    playerCount: 0,
    phase: "waiting" as GamePhase,
    pot: 0,
    exists: false,
  };
}

export function LobbyRoomsProvider({ children }: { children: ReactNode }) {
  const connection = getSolanaConnection();
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const initialLoadDone = useRef(false);
  const inFlight = useRef(false);

  const refresh = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (inFlight.current) return;
      if (typeof document !== "undefined" && document.hidden) return;

      inFlight.current = true;
      if (!opts?.silent && !initialLoadDone.current) {
        setLoading(true);
      }

      const tierPks = BUY_IN_TIERS.map((tier) => roomPda(tier.index)[0]);

      try {
        const infos = await withTimeout(
          connection.getMultipleAccountsInfo(tierPks),
          ROOM_FETCH_TIMEOUT_MS,
          tierPks.map(() => null)
        );

        const results = BUY_IN_TIERS.map((tier, i) => {
          const pk = tierPks[i];
          const info = infos[i];
          if (!info) return emptyTier(tier, pk);
          try {
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
        });
        setRooms(results);
      } catch {
        if (!initialLoadDone.current) {
          setRooms(BUY_IN_TIERS.map((tier) => emptyTier(tier, roomPda(tier.index)[0])));
        }
      } finally {
        inFlight.current = false;
        initialLoadDone.current = true;
        setLoading(false);
      }
    },
    [connection]
  );

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh({ silent: true }), ROOM_POLL_MS);

    const onVisibility = () => {
      if (!document.hidden) void refresh({ silent: true });
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const onlinePlayers = rooms.reduce((n, r) => n + r.playerCount, 0);
  const activeTables = rooms.filter(
    (r) => r.playerCount > 0 || r.phase !== "waiting"
  ).length;
  const bestRoom =
    [...rooms]
      .filter((r) => r.playerCount < 6)
      .sort((a, b) => b.playerCount - a.playerCount)[0] ?? rooms[0];

  return (
    <LobbyRoomsContext.Provider
      value={{ rooms, loading, onlinePlayers, activeTables, bestRoom, refresh }}
    >
      {children}
    </LobbyRoomsContext.Provider>
  );
}

export function useLobbyRooms(): LobbyRoomsContextValue {
  const ctx = useContext(LobbyRoomsContext);
  if (!ctx) {
    throw new Error("useLobbyRooms must be used within LobbyRoomsProvider");
  }
  return ctx;
}
