"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
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

export function useDemoGame() {
  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const [connected, setConnected] = useState(false);
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
    fetch("/api/demo/lobby")
      .then((r) => r.json())
      .then((stats) => stats && setLobbyStats(stats))
      .catch(() => {});

    const lobbyPoll = setInterval(() => {
      fetch("/api/demo/lobby")
        .then((r) => r.json())
        .then((stats) => stats && setLobbyStats(stats))
        .catch(() => {});
    }, 5000);

    const socket = io({
      path: "/api/socket",
      transports: ["websocket", "polling"],
      reconnectionAttempts: 12,
    });
    socketRef.current = socket;

    const onConnect = () => {
      setConnected(true);
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
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", () => {
      if (!sessionIdRef.current) {
        setJoinError("Socket offline — join still works via HTTP below");
      }
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
      syncSocket(stored);
    }

    return () => {
      clearInterval(lobbyPoll);
      socket.emit("leave-room", DEMO_ROOM_ID);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [syncSocket]);

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
        syncSocket(res.sessionId);
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
        const res = await fetch("/api/demo/join", {
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
        setJoinError("Network error — is the dev server running? (npm run dev)");
      } finally {
        setJoining(false);
      }
    },
    [applyJoinResult]
  );

  const leaveSeat = useCallback(() => {
    socketRef.current?.emit("demo-leave-seat", (res: { ok: boolean; role?: DemoRole }) => {
      if (res?.ok && res.role) setRole(res.role);
    });
  }, []);

  const takeSeat = useCallback(() => {
    socketRef.current?.emit("demo-take-seat", (res: { ok: boolean; error?: string; role?: DemoRole }) => {
      if (!res?.ok) {
        setJoinError(res?.error ?? "Could not take seat");
        return;
      }
      if (res.role) setRole(res.role);
      setJoinError(null);
    });
  }, []);

  const startHand = useCallback(() => {
    socketRef.current?.emit("demo-start-hand");
  }, []);

  const sendAction = useCallback(async (action: DemoAction) => {
    setActionPending(true);
    return new Promise<{ ok: boolean; error?: string }>((resolve) => {
      const socket = socketRef.current;
      if (!socket?.connected) {
        setActionPending(false);
        resolve({ ok: false, error: "Reconnecting…" });
        return;
      }
      socket.emit("demo-action", action, (res: { ok: boolean; error?: string }) => {
        setActionPending(false);
        resolve(res ?? { ok: false });
      });
    });
  }, []);

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
      localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
      setSessionId(null);
      sessionIdRef.current = null;
      setJoinError("Session expired — pick a username and join again");
    }, 8000);
    return () => clearTimeout(timer);
  }, [sessionId, view]);

  const leaveTable = useCallback(() => {
    localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    setSessionId(null);
    sessionIdRef.current = null;
    setView(null);
    setRole(null);
    setUsername("");
  }, []);

  return {
    connected,
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
