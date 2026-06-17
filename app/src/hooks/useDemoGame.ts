"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createAppSocket } from "@/lib/socket-client";
import { demoHttpApiUrl, postDemoJson } from "@/lib/demo-api";
import { SOCKET_URL } from "@/lib/constants";
import { DEMO_ROOM_ID } from "@/lib/demo/constants";
import {
  DEMO_ROOM_STORAGE_KEY,
  DEMO_SESSION_STORAGE_KEY,
  DEMO_USERNAME_STORAGE_KEY,
  validateUsername,
} from "@/lib/demo/ids";
import type { DemoAction, DemoRole, DemoRoomView, DemoTableInfo } from "@/lib/demo/types";
import type { ChatMessage } from "@/hooks/useSocket";
import type { DemoLobbyStats } from "@/components/demo/DemoJoinScreen";

type JoinResult = {
  ok: boolean;
  sessionId?: string;
  roomId?: string;
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
  setLobbyStats: (s: DemoLobbyStats) => void,
  setUsername?: (name: string) => void
) {
  setView(state);
  setLobbyStats({
    playerCount: state.playerCount,
    spectators: state.spectators.length,
    isFull: state.playerCount >= 6,
    maxPlayers: 6,
  });
  const seated = state.players.find((p) => p.sessionId === sid);
  const watching = state.spectators.find((s) => s.sessionId === sid);
  if (seated) {
    setRole("player");
    setUsername?.(seated.username);
    try {
      localStorage.setItem(DEMO_USERNAME_STORAGE_KEY, seated.username);
    } catch {
      // ignore
    }
  } else if (watching) {
    setRole("spectator");
    setUsername?.(watching.username);
    try {
      localStorage.setItem(DEMO_USERNAME_STORAGE_KEY, watching.username);
    } catch {
      // ignore
    }
  }
}

function lobbyFromTable(table: DemoTableInfo): DemoLobbyStats {
  return {
    playerCount: table.playerCount,
    spectators: table.spectators,
    isFull: table.isFull,
    maxPlayers: table.maxPlayers,
  };
}

export function useDemoGame() {
  const socketRef = useRef<Socket | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const roomIdRef = useRef<string>(DEMO_ROOM_ID);
  const lastChatTsRef = useRef(0);
  const httpModeRef = useRef(!SOCKET_URL);
  const socketSyncedRef = useRef(false);
  const [socketLive, setSocketLive] = useState(false);
  const [serverReady, setServerReady] = useState(false);
  const [view, setView] = useState<DemoRoomView | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string>(DEMO_ROOM_ID);
  const [role, setRole] = useState<DemoRole | null>(null);
  const [username, setUsername] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinNotice, setJoinNotice] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [actionPending, setActionPending] = useState(false);
  const [lobbyStats, setLobbyStats] = useState<DemoLobbyStats>(DEFAULT_LOBBY);
  const [tables, setTables] = useState<DemoTableInfo[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [seatDesync, setSeatDesync] = useState(false);
  const reclaimAttemptsRef = useRef(0);
  const reclaimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const MAX_RECLAIM_ATTEMPTS = 5;
  const lastStateSeqRef = useRef(0);

  const applyStateIfFresh = useCallback(
    (
      state: DemoRoomView,
      sid: string,
      opts?: { force?: boolean }
    ): boolean => {
      const seq = state.stateSeq ?? 0;
      if (!opts?.force && seq > 0 && seq < lastStateSeqRef.current) {
        return false;
      }
      if (seq > 0) lastStateSeqRef.current = seq;
      applyViewRole(state, sid, setView, setRole, setLobbyStats, setUsername);
      return true;
    },
    []
  );

  const applyTables = useCallback((next: DemoTableInfo[]) => {
    setTables(next);
    const pick =
      selectedRoomId ??
      next.find((t) => !t.isFull)?.roomId ??
      next[0]?.roomId ??
      DEMO_ROOM_ID;
    const table = next.find((t) => t.roomId === pick) ?? next[0];
    if (table) setLobbyStats(lobbyFromTable(table));
  }, [selectedRoomId]);

  const fetchLobby = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 8_000);
      const res = await fetch(demoHttpApiUrl("/api/demo/lobby"), {
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      if (!res.ok) return null;
      const data = (await res.json()) as { tables?: DemoTableInfo[] };
      if (data.tables) {
        applyTables(data.tables);
        setServerReady(true);
        setJoinError(null);
      }
      return data;
    } catch {
      return null;
    }
  }, [applyTables]);

  const fetchState = useCallback(async (sid: string, rid?: string) => {
    const room = rid ?? roomIdRef.current;
    try {
      const res = await fetch(
        demoHttpApiUrl(
          `/api/demo/state?sessionId=${encodeURIComponent(sid)}&roomId=${encodeURIComponent(room)}`
        )
      );
      if (res.status === 404) return null;
      if (!res.ok) return null;
      const data = await res.json();
      if (data.roomId) {
        setRoomId(data.roomId);
        roomIdRef.current = data.roomId;
        localStorage.setItem(DEMO_ROOM_STORAGE_KEY, data.roomId);
      }
      if (data.state) {
        applyStateIfFresh(data.state, sid, { force: !data.state.stateSeq });
      }
      if (data.lobby) setLobbyStats(data.lobby);
      return data;
    } catch {
      return null;
    }
  }, [applyStateIfFresh]);

  const demoHttpPost = useCallback(
    async (path: string, body: Record<string, unknown> = {}) => {
      const sid = sessionIdRef.current;
      if (!sid) return { ok: false, error: "Not in demo" };
      const res = await fetch(demoHttpApiUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sid,
          roomId: roomIdRef.current,
          ...body,
        }),
      });
      const data = await res.json();
      if (data.roomId) {
        setRoomId(data.roomId);
        roomIdRef.current = data.roomId;
        localStorage.setItem(DEMO_ROOM_STORAGE_KEY, data.roomId);
      }
      if (data.state) {
        applyStateIfFresh(data.state, sid, { force: !data.state.stateSeq });
        setSeatDesync(false);
      }
      if (data.lobby) setLobbyStats(data.lobby);
      return data;
    },
    []
  );

  const syncSocket = useCallback((sid: string, rid?: string) => {
    const socket = socketRef.current;
    if (!socket?.connected) {
      socketSyncedRef.current = false;
      httpModeRef.current = true;
      return;
    }
    const room = rid ?? roomIdRef.current;
    socket.emit("join-room", room);
    socket.emit(
      "demo-sync",
      { sessionId: sid, roomId: room },
      (res: { ok?: boolean; state?: DemoRoomView; roomId?: string }) => {
        if (res?.ok) {
          socketSyncedRef.current = true;
          httpModeRef.current = false;
        } else {
          socketSyncedRef.current = false;
          httpModeRef.current = true;
        }
        if (res?.roomId) {
          setRoomId(res.roomId);
          roomIdRef.current = res.roomId;
          localStorage.setItem(DEMO_ROOM_STORAGE_KEY, res.roomId);
        }
        if (res?.state) {
          applyStateIfFresh(res.state, sid, { force: !res.state.stateSeq });
          setSeatDesync(false);
        }
      }
    );
  }, [applyStateIfFresh]);

  const useSocketActions = useCallback(() => {
    const socket = socketRef.current;
    return Boolean(
      socket?.connected && socketSyncedRef.current && !httpModeRef.current
    );
  }, []);

  useEffect(() => {
    if (role !== "player" || !sessionId || !view) return;
    const seated = view.players.some((p) => p.sessionId === sessionId);
    if (!seated) return;
    setJoinNotice((prev) =>
      prev?.toLowerCase().includes("spectate") ? null : prev
    );
  }, [role, sessionId, view?.phase, view?.players]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    const storedRoom = localStorage.getItem(DEMO_ROOM_STORAGE_KEY);
    if (storedRoom) {
      setRoomId(storedRoom);
      roomIdRef.current = storedRoom;
      setSelectedRoomId(storedRoom);
    }

    void fetchLobby();
    const lobbyPoll = setInterval(() => void fetchLobby(), 3000);

    const socket = createAppSocket({ reconnectionAttempts: SOCKET_URL ? 12 : 3 });
    socketRef.current = socket;

    const onConnect = () => {
      setSocketLive(true);
      void fetchLobby();
      setJoinError(null);
      const sid = sessionIdRef.current ?? localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
      const rid = roomIdRef.current;
      if (sid) {
        syncSocket(sid, rid);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", () => {
      setSocketLive(false);
      socketSyncedRef.current = false;
      httpModeRef.current = true;
    });
    socket.on("connect_error", () => {
      setSocketLive(false);
      socketSyncedRef.current = false;
      httpModeRef.current = true;
      void fetchLobby();
    });

    socket.on("demo-lobby-tables", (payload: { tables?: DemoTableInfo[] }) => {
      if (!sessionIdRef.current) return;
      if (payload?.tables) applyTables(payload.tables);
    });

    socket.on("demo-lobby-stats", (stats: DemoLobbyStats) => {
      if (!sessionIdRef.current || !stats || !roomIdRef.current) return;
      setLobbyStats(stats);
    });

    socket.on("demo-state", (state: DemoRoomView) => {
      const sid = sessionIdRef.current;
      if (sid) {
        applyStateIfFresh(state, sid, { force: !state.stateSeq });
      } else {
        setView(state);
      }
    });

    socket.on("chat-message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-99), msg]);
    });

    const storedName = localStorage.getItem(DEMO_USERNAME_STORAGE_KEY);
    if (storedName) setUsername(storedName);

    const stored = localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
    if (stored) {
      setSessionId(stored);
      if (socket.connected) {
        syncSocket(stored, roomIdRef.current);
      } else {
        void fetchState(stored, roomIdRef.current).then((data) => {
          if (!data) {
            localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
            localStorage.removeItem(DEMO_ROOM_STORAGE_KEY);
            setSessionId(null);
            sessionIdRef.current = null;
          }
        });
      }
    }

    return () => {
      clearInterval(lobbyPoll);
      const rid = roomIdRef.current;
      if (rid) socket.emit("leave-room", rid);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [syncSocket, fetchLobby, fetchState, applyTables]);

  const fetchChat = useCallback(async () => {
    try {
      const res = await fetch(
        demoHttpApiUrl(`/api/demo/chat?since=${lastChatTsRef.current}`)
      );
      if (!res.ok) return;
      const data = await res.json();
      const incoming = (data.messages ?? []) as ChatMessage[];
      if (!incoming.length) return;
      setMessages((prev) => {
        const merged = [...prev];
        for (const m of incoming) {
          if (merged.some((x) => x.ts === m.ts && x.wallet === m.wallet)) continue;
          merged.push(m);
        }
        return merged.slice(-100);
      });
      lastChatTsRef.current = Math.max(
        lastChatTsRef.current,
        ...incoming.map((m) => m.ts)
      );
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const sid = sessionId;
    if (!sid) return;

    const httpOnly = httpModeRef.current || !socketLive;
    const ms = httpOnly ? 1000 : 2500;
    void fetchState(sid, roomIdRef.current);
    const poll = setInterval(() => void fetchState(sid, roomIdRef.current), ms);
    return () => clearInterval(poll);
  }, [sessionId, socketLive, fetchState, roomId]);

  useEffect(() => {
    if (!sessionId) return;
    if (socketLive && !httpModeRef.current) return;

    void fetchChat();
    const poll = setInterval(() => void fetchChat(), 2000);
    return () => clearInterval(poll);
  }, [sessionId, socketLive, fetchChat]);

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
        setSeatDesync(false);
      }
      if (res.roomId) {
        setRoomId(res.roomId);
        roomIdRef.current = res.roomId;
        setSelectedRoomId(res.roomId);
        localStorage.setItem(DEMO_ROOM_STORAGE_KEY, res.roomId);
      }
      if (res.sessionId) {
        if (socketRef.current?.connected) {
          syncSocket(res.sessionId, res.roomId);
        } else {
          socketSyncedRef.current = false;
          httpModeRef.current = true;
        }
      }
      if (res.state) {
        lastStateSeqRef.current = res.state.stateSeq ?? 0;
        setView(res.state);
      }
      if (res.role) setRole(res.role);
      if (res.notice) {
        setJoinNotice(res.notice);
      } else if (res.role === "player") {
        setJoinNotice(null);
      }
      setUsername(valid);
      try {
        localStorage.setItem(DEMO_USERNAME_STORAGE_KEY, valid);
      } catch {
        // ignore
      }
      setJoinError(null);
    },
    [syncSocket]
  );

  const reconnectSeat = useCallback(async () => {
    const sid = sessionIdRef.current;
    const name = validateUsername(username) ?? validateUsername(
      localStorage.getItem(DEMO_USERNAME_STORAGE_KEY) ?? ""
    );
    if (!sid || !name) {
      setJoinError("Could not reconnect — leave the table and join again");
      return;
    }
    setJoining(true);
    try {
      const data = await postDemoJson<JoinResult>("/api/demo/join", {
        username: name,
        sessionId: sid,
        preferPlayer: true,
        roomId: roomIdRef.current,
      });
      applyJoinResult(data, name);
      if (data.ok) {
        setSeatDesync(false);
        reclaimAttemptsRef.current = 0;
      } else {
        setJoinError(data.error ?? "Could not reconnect to your seat");
      }
    } catch {
      setJoinError("Network error — try again");
    } finally {
      setJoining(false);
    }
  }, [applyJoinResult, username]);

  useEffect(() => {
    if (!view || !sessionId) return;
    const seated = view.players.some((p) => p.sessionId === sessionId);
    if (seated) {
      setSeatDesync(false);
      reclaimAttemptsRef.current = 0;
      if (reclaimTimerRef.current) {
        clearTimeout(reclaimTimerRef.current);
        reclaimTimerRef.current = null;
      }
      return;
    }
    const name =
      validateUsername(username) ??
      validateUsername(localStorage.getItem(DEMO_USERNAME_STORAGE_KEY) ?? "");
    if (!name) return;
    const orphan = view.players.find(
      (p) => p.username.toLowerCase() === name.toLowerCase()
    );
    if (!orphan) return;
    if (reclaimAttemptsRef.current >= MAX_RECLAIM_ATTEMPTS) {
      setSeatDesync(true);
      return;
    }
    if (joining || reclaimTimerRef.current) return;
    setSeatDesync(true);
    const delay = Math.min(8000, 400 * (reclaimAttemptsRef.current + 1));
    reclaimTimerRef.current = setTimeout(() => {
      reclaimTimerRef.current = null;
      reclaimAttemptsRef.current += 1;
      void reconnectSeat();
    }, delay);
    return () => {
      if (reclaimTimerRef.current) {
        clearTimeout(reclaimTimerRef.current);
        reclaimTimerRef.current = null;
      }
    };
  }, [view, sessionId, username, reconnectSeat, joining]);

  const join = useCallback(
    async (name: string, preferPlayer = true, targetRoomId?: string | null) => {
      const valid = validateUsername(name);
      if (!valid) {
        setJoinError("Pick a username (2–16 chars, letters/numbers/_)");
        return;
      }

      const stored = localStorage.getItem(DEMO_SESSION_STORAGE_KEY);
      const room =
        targetRoomId ??
        selectedRoomId ??
        tables.find((t) => !t.isFull)?.roomId ??
        DEMO_ROOM_ID;

      setJoinError(null);
      setJoinNotice(null);
      setJoining(true);
      setUsername(valid);

      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
      const retryable = (msg: string) =>
        /busy|timed out|503|502|504/i.test(msg);

      try {
        let lastErr: Error | null = null;
        for (let attempt = 0; attempt < 4; attempt++) {
          try {
            const data = await postDemoJson<JoinResult>(
              "/api/demo/join",
              {
                username: valid,
                preferPlayer,
                sessionId: stored ?? undefined,
                roomId: room,
              },
              18_000
            );
            if (!data.ok) {
              const errMsg = data.error ?? "Could not join";
              if (attempt < 3 && retryable(errMsg)) {
                await sleep(350 * (attempt + 1));
                continue;
              }
              setJoinError(errMsg);
              return;
            }
            applyJoinResult(data, valid);
            return;
          } catch (err) {
            lastErr = err instanceof Error ? err : new Error("Join failed");
            if (attempt < 3 && retryable(lastErr.message)) {
              await sleep(350 * (attempt + 1));
              continue;
            }
            break;
          }
        }
        const msg = lastErr?.message ?? "Join failed";
        setJoinError(
          msg === "Request timed out"
            ? "Join timed out — try again in a few seconds"
            : retryable(msg)
              ? msg
              : "Network error — check your connection and try again"
        );
      } catch (err) {
        const msg =
          err instanceof Error && err.message === "Request timed out"
            ? "Join timed out — try again in a few seconds"
            : "Network error — check your connection and try again";
        setJoinError(msg);
      } finally {
        setJoining(false);
      }
    },
    [applyJoinResult, selectedRoomId, tables]
  );

  const leaveSeat = useCallback(async () => {
    const socket = socketRef.current;
    if (useSocketActions()) {
      return new Promise<void>((resolve) => {
        socket!.emit("demo-leave-seat", (res: { ok: boolean; role?: DemoRole; error?: string }) => {
          if (res?.ok && res.role) setRole(res.role);
          else if (res?.error === "Not in demo") {
            socketSyncedRef.current = false;
            httpModeRef.current = true;
            void demoHttpPost("/api/demo/leave-seat").then((httpRes) => {
              if (httpRes?.ok && httpRes.role) setRole(httpRes.role);
              resolve();
            });
            return;
          }
          resolve();
        });
      });
    }
    const res = await demoHttpPost("/api/demo/leave-seat");
    if (res?.ok && res.role) setRole(res.role);
  }, [demoHttpPost, useSocketActions]);

  const takeSeat = useCallback(async () => {
    const socket = socketRef.current;
    if (useSocketActions()) {
      return new Promise<void>((resolve) => {
        socket!.emit("demo-take-seat", (res: { ok: boolean; error?: string; role?: DemoRole }) => {
          if (!res?.ok) {
            if (res?.error === "Not in demo") {
              socketSyncedRef.current = false;
              httpModeRef.current = true;
              void demoHttpPost("/api/demo/take-seat").then((httpRes) => {
                if (!httpRes?.ok) setJoinError(httpRes?.error ?? "Could not take seat");
                else if (httpRes.role) {
                  setRole(httpRes.role);
                  setJoinError(null);
                  setJoinNotice(null);
                }
                resolve();
              });
              return;
            }
            setJoinError(res?.error ?? "Could not take seat");
            resolve();
            return;
          }
          if (res.role) setRole(res.role);
          setJoinError(null);
          setJoinNotice(null);
          resolve();
        });
      });
    }
    const res = await demoHttpPost("/api/demo/take-seat");
    if (!res?.ok) {
      setJoinError(res?.error ?? "Could not take seat");
      return;
    }
    if (res.role) setRole(res.role);
    setJoinError(null);
    setJoinNotice(null);
  }, [demoHttpPost, useSocketActions]);

  const startHand = useCallback(async () => {
    const socket = socketRef.current;
    if (useSocketActions()) {
      return new Promise<void>((resolve) => {
        socket!.emit("demo-start-hand", (res: { ok?: boolean; error?: string }) => {
          if (res?.error === "Not in demo" || res?.error === "Must be seated") {
            if (res.error === "Not in demo") {
              socketSyncedRef.current = false;
              httpModeRef.current = true;
              void demoHttpPost("/api/demo/start-hand").then(() => resolve());
              return;
            }
          }
          resolve();
        });
      });
    }
    await demoHttpPost("/api/demo/start-hand");
  }, [demoHttpPost, useSocketActions]);

  const setSitOut = useCallback(
    async (sitOut: boolean) => {
      const socket = socketRef.current;
      if (useSocketActions()) {
        return new Promise<{ ok: boolean; error?: string }>((resolve) => {
          socket!.emit(
            "demo-sit-out",
            sitOut,
            (res: { ok: boolean; error?: string }) => {
              if (res?.error === "Not in demo" || res?.error === "Must be seated") {
                if (res.error === "Not in demo") {
                  socketSyncedRef.current = false;
                  httpModeRef.current = true;
                  void demoHttpPost("/api/demo/sit-out", { sitOut }).then((httpRes) => {
                    resolve({ ok: Boolean(httpRes?.ok), error: httpRes?.error });
                  });
                  return;
                }
              }
              resolve(res ?? { ok: false });
            }
          );
        });
      }
      const res = await demoHttpPost("/api/demo/sit-out", { sitOut });
      return { ok: Boolean(res?.ok), error: res?.error };
    },
    [demoHttpPost, useSocketActions]
  );

  const sendAction = useCallback(
    async (action: DemoAction) => {
      setActionPending(true);
      const socket = socketRef.current;
      if (useSocketActions()) {
        return new Promise<{ ok: boolean; error?: string }>((resolve) => {
          socket!.emit("demo-action", action, (res: { ok: boolean; error?: string }) => {
            if (res?.error === "Not in demo") {
              socketSyncedRef.current = false;
              httpModeRef.current = true;
              void demoHttpPost("/api/demo/action", { action }).then((httpRes) => {
                setActionPending(false);
                resolve({ ok: Boolean(httpRes?.ok), error: httpRes?.error });
              });
              return;
            }
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
    [demoHttpPost, useSocketActions]
  );

  const sendMessage = useCallback(
    async (text: string, avatar?: string) => {
      const sid = sessionIdRef.current;
      const name = username;
      const trimmed = text.trim();
      if (!sid || !name || !trimmed) return;

      const rid = roomIdRef.current;
      const socket = socketRef.current;
      if (socket?.connected && socketSyncedRef.current && !httpModeRef.current) {
        socket.emit("chat-message", {
          roomId: rid,
          wallet: sid,
          displayName: name,
          avatar,
          text: trimmed,
        });
        return;
      }

      try {
        const res = await fetch(demoHttpApiUrl("/api/demo/chat"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sid,
            roomId: rid,
            displayName: name,
            avatar,
            text: trimmed,
          }),
        });
        const data = await res.json();
        if (data.message) {
          setMessages((prev) => [...prev.slice(-99), data.message as ChatMessage]);
          lastChatTsRef.current = Math.max(lastChatTsRef.current, data.message.ts);
        }
      } catch {
        // ignore
      }
    },
    [username]
  );

  useEffect(() => {
    if (!sessionId || view) return;
    const timer = window.setTimeout(() => {
      void fetchState(sessionId, roomIdRef.current).then((data) => {
        if (data?.state) return;
        localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
        localStorage.removeItem(DEMO_ROOM_STORAGE_KEY);
        setSessionId(null);
        sessionIdRef.current = null;
        setJoinError("Session expired — pick a username and join again");
      });
    }, 12000);
    return () => clearTimeout(timer);
  }, [sessionId, view, fetchState]);

  const leaveTable = useCallback(() => {
    localStorage.removeItem(DEMO_SESSION_STORAGE_KEY);
    localStorage.removeItem(DEMO_ROOM_STORAGE_KEY);
    localStorage.removeItem(DEMO_USERNAME_STORAGE_KEY);
    reclaimAttemptsRef.current = 0;
    lastStateSeqRef.current = 0;
    setSessionId(null);
    sessionIdRef.current = null;
    setView(null);
    setRole(null);
    setUsername("");
    setRoomId(DEMO_ROOM_ID);
    roomIdRef.current = DEMO_ROOM_ID;
  }, []);

  const quickJoin = useCallback(
    (name: string) => join(name, true, null),
    [join]
  );

  return {
    connected: serverReady,
    socketLive,
    view,
    sessionId,
    roomId,
    role,
    username,
    joinError,
    joinNotice,
    joining,
    messages,
    lobbyStats,
    tables,
    selectedRoomId,
    setSelectedRoomId,
    actionPending,
    join,
    quickJoin,
    leaveSeat,
    takeSeat,
    startHand,
    setSitOut,
    sendAction,
    sendMessage,
    leaveTable,
    seatDesync,
    reconnectSeat,
    socket: socketRef,
  };
}
