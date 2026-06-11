"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createAppSocket } from "@/lib/socket-client";
import { demoApiUrl } from "@/lib/demo-api";
import { SOCKET_URL } from "@/lib/constants";
import { DEMO_ROOM_ID } from "@/lib/demo/constants";
import { DEMO_SESSION_STORAGE_KEY, validateUsername } from "@/lib/demo/ids";
import type { DemoAction, DemoRole, DemoRoomView } from "@/lib/demo/types";
import type { ChatMessage } from "@/hooks/useSocket";
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

function applyViewRole(
  state: DemoRoomView,
  sid: string,
  setView: (v: DemoRoomView) => void,
  setRole: (r: DemoRole) => void,
  setLobbyStats: (s: DemoLobbyStats) => void
) {
  setView(state);
  setLobbyStats({
    playerCount: state.playerCount,
    spectators: state.spectators.length,
    isFull: state.playerCount >= 6,
    maxPlayers: 6,
  });
  if (state.players.some((p) => p.sessionId === sid)) setRole("player");
  else if (state.spectators.some((s) => s.sessionId === sid)) setRole("spectator");
}

export function useDemoGame() {
  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const httpModeRef = useRef(!SOCKET_URL);
  const [socketLive, setSocketLive] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [view, setView] = useState<DemoRoomView | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [role, setRole] = useState<DemoRole | null>(null);
  const [username, setUsername] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinNotice, setJoinNotice] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [actionPending, setActionPending] = useState(false);
  const [lobbyStats, setLobbyStats] = useState<DemoLobbyStats>(DEFAULT_LOBBY);

  const fetchLobby = useCallback(async () => {
    try {
      const res = await fetch(demoApiUrl("/api/demo/lobby"));
      if (!res.ok) return null;
      const stats = (await res.json()) as DemoLobbyStats;
      if (stats) {
        setLobbyStats(stats);
        setServerReady(true);
      }
      return stats;
    } catch {
      return null;
    }
  }, []);

  const fetchState = useCallback(async (sid: string) => {
    try {
      const res = await fetch(
        demoApiUrl(`/api/demo/state?sessionId=${encodeURIComponent(sid)}`)
      );
      if (res.status === 404) return null;
      if (!res.ok) return null;
      const data = await res.json();
      if (data.state) {
        applyViewRole(data.state, sid, setView, setRole, setLobbyStats);
      }
      if (data.lobby) setLobbyStats(data.lobby);
      return data;
    } catch {
      return null;
    }
  }, []);

  const demoHttpPost = useCallback(
    async (path: string, body: Record<string, unknown> = {}) => {
      const sid = sessionIdRef.current;
      if (!sid) return { ok: false, error: "Not in demo" };
      const res = await fetch(demoApiUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, ...body }),
      });
      const data = await res.json();
      if (data.state) {
        applyViewRole(data.state, sid, setView, setRole, setLobbyStats);
      }
      if (data.lobby) setLobbyStats(data.lobby);
      return data;
    },
    []
  );

  const syncSocket = useCallback((sid: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) return;
    socket.emit("join-room", DEMO_ROOM_ID);
    socket.emit("demo-sync", { sessionId: sid }, (res: { ok?: boolean; state?: DemoRoomView }) => {
      if (res?.state) setView(res.state);
    });
  }, []);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    void fetchLobby();
    const lobbyPoll = setInterval(() => void fetchLobby(), 5000);

    const socket = createAppSocket({ reconnectionAttempts: SOCKET_URL ? 12 : 3 });
    socketRef.current = socket;

    const onConnect = () => {
      setSocketLive(true);
      setServerReady(true);
      httpModeRef.current = false;
      setJoinError(null);
      socket.emit("join-room", DEMO_ROOM_ID);
      const sid = sessionIdRef.current ?? localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
      if (sid) syncSocket(sid);
      else {
        socket.emit("demo-peek", (stats: DemoLobbyStats) => {
          if (stats) setLobbyStats(stats);
        });
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", () => setSocketLive(false));
    socket.on("connect_error", () => {
      httpModeRef.current = true;
      void fetchLobby();
    });

    socket.on("demo-lobby-stats", (stats: DemoLobbyStats) => {
      if (stats) setLobbyStats(stats);
    });

    socket.on("demo-state", (state: DemoRoomView) => {
      setView(state);
      setLobbyStats({
        playerCount: state.playerCount,
        spectators: state.spectators.length,
        isFull: state.playerCount >= 6,
        maxPlayers: 6,
      });
      const sid = sessionIdRef.current;
      if (sid) {
        if (state.players.some((p) => p.sessionId === sid)) setRole("player");
        else if (state.spectators.some((s) => s.sessionId === sid)) setRole("spectator");
      }
    });

    socket.on("chat-message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-99), msg]);
    });

    const stored = localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
    if (stored) {
      setSessionId(stored);
      if (socket.connected) {
        syncSocket(stored);
      } else {
        void fetchState(stored).then((data) => {
          if (!data) {
            localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
            setSessionId(null);
            sessionIdRef.current = null;
          }
        });
      }
    }

    return () => {
      clearInterval(lobbyPoll);
      socket.emit("leave-room", DEMO_ROOM_ID);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [syncSocket, fetchLobby, fetchState]);

  useEffect(() => {
    const sid = sessionId;
    if (!sid) return;
    if (socketLive && !httpModeRef.current) return;

    void fetchState(sid);
    const poll = setInterval(() => void fetchState(sid), 1500);
    return () => clearInterval(poll);
  }, [sessionId, socketLive, fetchState]);

  const applyJoinResult = useCallback(
    (res: JoinResult, valid: string) => {
      if (!res.ok) {
        setJoinError(res.error ?? "Could not join");
        return;
      }
      if (res.sessionId) {
        setSessionId(res.sessionId);
        sessionIdRef.current = res.sessionId;
        localStorage.setItem(DEMO_SESSION_STORAGE_KEY, res.sessionId);
        if (socketRef.current?.connected) {
          syncSocket(res.sessionId);
        } else {
          httpModeRef.current = true;
        }
      }
      if (res.state) setView(res.state);
      if (res.role) setRole(res.role);
      if (res.notice) setJoinNotice(res.notice);
      setUsername(valid);
      setJoinError(null);
    },
    [syncSocket]
  );

  const join = useCallback(
    async (name: string, preferPlayer = true) => {
      const valid = validateUsername(name);
      if (!valid) {
        setJoinError("Pick a username (2–16 chars, letters/numbers/_)");
        return;
      }

      const stored = localStorage.getItem(DEMO_SESSION_STORAGE_KEY);

      setJoinError(null);
      setJoinNotice(null);
      setJoining(true);
      setUsername(valid);

      try {
        const res = await fetch(demoApiUrl("/api/demo/join"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: valid,
            preferPlayer,
            sessionId: stored ?? undefined,
          }),
        });
        const data: JoinResult = await res.json();
        applyJoinResult(data, valid);
      } catch {
        setJoinError("Network error — check your connection and try again");
      } finally {
        setJoining(false);
      }
    },
    [applyJoinResult]
  );

  const leaveSeat = useCallback(async () => {
    const socket = socketRef.current;
    if (socket?.connected && !httpModeRef.current) {
      socket.emit("demo-leave-seat", (res: { ok: boolean; role?: DemoRole }) => {
        if (res?.ok && res.role) setRole(res.role);
      });
      return;
    }
    const res = await demoHttpPost("/api/demo/leave-seat");
    if (res?.ok && res.role) setRole(res.role);
  }, [demoHttpPost]);

  const takeSeat = useCallback(async () => {
    const socket = socketRef.current;
    if (socket?.connected && !httpModeRef.current) {
      socket.emit("demo-take-seat", (res: { ok: boolean; error?: string; role?: DemoRole }) => {
        if (!res?.ok) {
          setJoinError(res?.error ?? "Could not take seat");
          return;
        }
        if (res.role) setRole(res.role);
        setJoinError(null);
      });
      return;
    }
    const res = await demoHttpPost("/api/demo/take-seat");
    if (!res?.ok) {
      setJoinError(res?.error ?? "Could not take seat");
      return;
    }
    if (res.role) setRole(res.role);
    setJoinError(null);
  }, [demoHttpPost]);

  const startHand = useCallback(async () => {
    const socket = socketRef.current;
    if (socket?.connected && !httpModeRef.current) {
      socket.emit("demo-start-hand");
      return;
    }
    await demoHttpPost("/api/demo/start-hand");
  }, [demoHttpPost]);

  const sendAction = useCallback(
    async (action: DemoAction) => {
      setActionPending(true);
      const socket = socketRef.current;
      if (socket?.connected && !httpModeRef.current) {
        return new Promise<{ ok: boolean; error?: string }>((resolve) => {
          socket.emit("demo-action", action, (res: { ok: boolean; error?: string }) => {
            setActionPending(false);
            resolve(res ?? { ok: false });
          });
        });
      }
      try {
        const res = await demoHttpPost("/api/demo/action", { action });
        setActionPending(false);
        return { ok: Boolean(res?.ok), error: res?.error };
      } catch {
        setActionPending(false);
        return { ok: false, error: "Network error" };
      }
    },
    [demoHttpPost]
  );

  const sendMessage = useCallback(
    (text: string, avatar?: string) => {
      const sid = sessionIdRef.current;
      const name = username;
      if (!sid || !name) return;
      socketRef.current?.emit("chat-message", {
        roomId: DEMO_ROOM_ID,
        wallet: sid,
        displayName: name,
        avatar,
        text,
      });
    },
    [username]
  );

  useEffect(() => {
    if (!sessionId || view) return;
    const timer = window.setTimeout(() => {
      void fetchState(sessionId).then((data) => {
        if (data?.state) return;
        localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
        setSessionId(null);
        sessionIdRef.current = null;
        setJoinError("Session expired — pick a username and join again");
      });
    }, 12000);
    return () => clearTimeout(timer);
  }, [sessionId, view, fetchState]);

  const leaveTable = useCallback(() => {
    localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    setSessionId(null);
    sessionIdRef.current = null;
    setView(null);
    setRole(null);
    setUsername("");
  }, []);

  return {
    connected: serverReady,
    socketLive,
    view,
    sessionId,
    role,
    username,
    joinError,
    joinNotice,
    joining,
    lobbyStats,
    messages,
    actionPending,
    join,
    leaveSeat,
    takeSeat,
    startHand,
    sendAction,
    sendMessage,
    leaveTable,
    socket: socketRef,
  };
}
