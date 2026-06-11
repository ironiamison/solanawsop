"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DemoAction, DemoRole, DemoRoomView } from "@/lib/demo/types";
import { validateUsername } from "@/lib/demo/ids";
import type { DemoLobbyStats } from "@/components/demo/DemoJoinScreen";

type JoinResult = {
  ok: boolean;
  sessionId?: string;
  role?: DemoRole;
  error?: string;
  notice?: string;
  state?: DemoRoomView;
};

const DEFAULT_LOBBY: DemoLobbyStats = {
  playerCount: 0,
  spectators: 0,
  isFull: false,
  maxPlayers: 6,
};

export function useChipRoomGame(config: {
  apiBase: string;
  storageKey: string;
  pollMs?: number;
  extra?: Record<string, string | null | undefined>;
}) {
  const { apiBase, storageKey, pollMs = 1200, extra = {} } = config;
  const extraRef = useRef(extra);
  extraRef.current = extra;
  const sessionIdRef = useRef<string | null>(null);
  const [view, setView] = useState<DemoRoomView | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [role, setRole] = useState<DemoRole | null>(null);
  const [username, setUsername] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinNotice, setJoinNotice] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [actionPending, setActionPending] = useState(false);
  const [lobbyStats, setLobbyStats] = useState<DemoLobbyStats>(DEFAULT_LOBBY);
  const [connected, setConnected] = useState(false);

  const applyState = useCallback((state: DemoRoomView, sid: string) => {
    setView(state);
    setLobbyStats({
      playerCount: state.playerCount,
      spectators: state.spectators.length,
      isFull: state.playerCount >= 6,
      maxPlayers: 6,
    });
    if (state.players.some((p) => p.sessionId === sid)) setRole("player");
    else if (state.spectators.some((s) => s.sessionId === sid)) setRole("spectator");
  }, []);

  const fetchState = useCallback(
    async (sid: string) => {
      try {
        const params = new URLSearchParams({ sessionId: sid });
        for (const [k, v] of Object.entries(extraRef.current)) {
          if (v) params.set(k, v);
        }
        const res = await fetch(`${apiBase}/state?${params}`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data.state) applyState(data.state, sid);
        if (data.lobby) setLobbyStats(data.lobby);
        setConnected(true);
        return data;
      } catch {
        return null;
      }
    },
    [apiBase, applyState]
  );

  const httpPost = useCallback(
    async (path: string, body: Record<string, unknown> = {}) => {
      const sid = sessionIdRef.current;
      const res = await fetch(`${apiBase}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, ...extraRef.current, ...body }),
      });
      const data = await res.json();
      if (data.state && sid) applyState(data.state, sid);
      if (data.lobby) setLobbyStats(data.lobby);
      setConnected(true);
      return data;
    },
    [apiBase, applyState]
  );

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      setSessionId(stored);
      void fetchState(stored);
    }
  }, [storageKey, fetchState]);

  useEffect(() => {
    if (!sessionId) return;
    const poll = setInterval(() => void fetchState(sessionId), pollMs);
    return () => clearInterval(poll);
  }, [sessionId, fetchState, pollMs]);

  const join = useCallback(
    async (name: string, preferPlayer = true, extra: Record<string, unknown> = {}) => {
      const valid = validateUsername(name);
      if (!valid) {
        setJoinError("Username must be 2–16 letters, numbers, or _");
        return;
      }
      setJoining(true);
      setJoinError(null);
      setJoinNotice(null);
      setUsername(valid);

      const existing = localStorage.getItem(storageKey) ?? undefined;
      try {
        const res = await fetch(`${apiBase}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: valid,
            preferPlayer,
            sessionId: existing,
            ...extraRef.current,
            ...extra,
          }),
        });
        const data = (await res.json()) as JoinResult;
        if (!data.ok || !data.sessionId) {
          setJoinError(data.error ?? "Could not join");
          return;
        }
        localStorage.setItem(storageKey, data.sessionId);
        sessionIdRef.current = data.sessionId;
        setSessionId(data.sessionId);
        if (data.role) setRole(data.role);
        if (data.notice) setJoinNotice(data.notice);
        if (data.state) applyState(data.state, data.sessionId);
        setConnected(true);
      } catch {
        setJoinError("Network error");
      } finally {
        setJoining(false);
      }
    },
    [apiBase, storageKey, applyState]
  );

  const leaveSeat = useCallback(async () => {
    const res = await httpPost("/leave-seat");
    if (res?.ok && res.role) setRole(res.role);
  }, [httpPost]);

  const takeSeat = useCallback(async () => {
    const res = await httpPost("/take-seat");
    if (!res?.ok) setJoinError(res?.error ?? "Could not take seat");
    else if (res.role) setRole(res.role);
  }, [httpPost]);

  const setSitOut = useCallback(
    async (sitOut: boolean) => {
      const res = await httpPost("/sit-out", { sitOut });
      return { ok: Boolean(res?.ok), error: res?.error };
    },
    [httpPost]
  );

  const sendAction = useCallback(
    async (action: DemoAction) => {
      setActionPending(true);
      try {
        const res = await httpPost("/action", { action });
        setActionPending(false);
        return { ok: Boolean(res?.ok), error: res?.error };
      } catch {
        setActionPending(false);
        return { ok: false, error: "Network error" };
      }
    },
    [httpPost]
  );

  const leaveTable = useCallback(() => {
    localStorage.removeItem(storageKey);
    setSessionId(null);
    sessionIdRef.current = null;
    setView(null);
    setRole(null);
    setUsername("");
  }, [storageKey]);

  return {
    connected,
    socketLive: false,
    view,
    sessionId,
    role,
    username,
    joinError,
    joinNotice,
    joining,
    lobbyStats,
    messages: [] as never[],
    actionPending,
    join,
    leaveSeat,
    takeSeat,
    setSitOut,
    sendAction,
    sendMessage: async () => {},
    leaveTable,
    startHand: async () => {},
    socket: { current: null },
  };
}
