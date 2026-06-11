import type { Server, Socket } from "socket.io";
import { DEMO_ROOM_ID } from "./constants";
import { demoRoom } from "./engine";
import { newSessionId, validateUsername } from "./ids";
import type { DemoAction } from "./types";

export function lobbyStats() {
  const view = demoRoom.getView();
  return {
    playerCount: view.playerCount,
    spectators: view.spectators.length,
    isFull: demoRoom.isFull(),
    maxPlayers: 6,
  };
}

export function wireDemoBroadcast(io: Server): void {
  demoRoom.onStateChange(() => broadcast(io));
  setInterval(() => {
    if (demoRoom.checkTurnTimeout()) broadcast(io);
  }, 500);
}

function broadcast(io: Server): void {
  const stats = lobbyStats();
  for (const [, socket] of io.sockets.sockets) {
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (sessionId) {
      socket.emit("demo-state", demoRoom.getView(sessionId));
    }
  }
  io.to(DEMO_ROOM_ID).emit("demo-lobby-stats", stats);
}

export function attachDemoHandlers(socket: Socket, io: Server): void {
  socket.on("demo-peek", (ack?: (res: unknown) => void) => {
    const stats = lobbyStats();
    if (typeof ack === "function") ack(stats);
    socket.emit("demo-lobby-stats", stats);
  });

  socket.on(
    "demo-sync",
    (data: { sessionId?: string }, ack?: (res: unknown) => void) => {
      const sessionId = data?.sessionId;
      if (!sessionId || !demoRoom.hasSession(sessionId)) {
        const err = { ok: false, error: "Session not found — join again" };
        if (typeof ack === "function") ack(err);
        socket.emit("demo-join-result", err);
        return;
      }
      socket.join(DEMO_ROOM_ID);
      socket.data.demoSessionId = sessionId;
      socket.data.roomId = DEMO_ROOM_ID;
      demoRoom.rebindSocket(sessionId, socket.id);
      const result = { ok: true, sessionId, state: demoRoom.getView(sessionId) };
      if (typeof ack === "function") ack(result);
      socket.emit("demo-join-result", result);
      socket.emit("demo-state", demoRoom.getView(sessionId));
      broadcast(io);
    }
  );

  socket.on(
    "demo-join",
    (
      data: { username: string; sessionId?: string; preferPlayer?: boolean },
      ack?: (res: unknown) => void
    ) => {
      const username = validateUsername(data.username ?? "");
      if (!username) {
        const bad = { ok: false, error: "Username must be 2–16 letters, numbers, or _" };
          if (typeof ack === "function") ack(bad);
          socket.emit("demo-join-result", bad);
          return;
        }

      const sessionId = data.sessionId || newSessionId();
        if (demoRoom.usernameTaken(username, sessionId)) {
          const taken = { ok: false, error: "Username already taken" };
          if (typeof ack === "function") ack(taken);
          socket.emit("demo-join-result", taken);
          return;
        }

      socket.join(DEMO_ROOM_ID);
      socket.data.demoSessionId = sessionId;
      socket.data.roomId = DEMO_ROOM_ID;

      const wantPlayer = data.preferPlayer !== false;
      let role: "player" | "spectator" = "spectator";

      if (wantPlayer && !demoRoom.isFull()) {
        const result = demoRoom.joinAsPlayer(sessionId, username, socket.id);
        if (result.ok) {
          role = "player";
        } else {
          demoRoom.joinAsSpectator(sessionId, username, socket.id);
        }
      } else {
        demoRoom.joinAsSpectator(sessionId, username, socket.id);
          if (wantPlayer && demoRoom.isFull()) {
            const full = {
              ok: true,
              sessionId,
              role: "spectator" as const,
              wallet: sessionId,
              notice: "Table full — you're spectating. A seat opens when someone leaves.",
            };
            if (typeof ack === "function") ack(full);
            socket.emit("demo-join-result", full);
            broadcast(io);
            socket.emit("demo-state", demoRoom.getView(sessionId));
            return;
          }
        }

        const ok = { ok: true, sessionId, role, wallet: sessionId };
        if (typeof ack === "function") ack(ok);
        socket.emit("demo-join-result", ok);
        broadcast(io);
        socket.emit("demo-state", demoRoom.getView(sessionId));
    }
  );

  socket.on("demo-leave-seat", (ack?: (res: unknown) => void) => {
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (!sessionId) {
      ack?.({ ok: false, error: "Not in demo" });
      return;
    }
    const seated = demoRoom.findPlayer(sessionId);
    const username = seated?.username ?? "Guest";
    const result = demoRoom.leaveSeat(sessionId);
    if (!result.ok) {
      ack?.(result);
      return;
    }
    demoRoom.joinAsSpectator(sessionId, username, socket.id);
    ack?.({ ok: true, role: "spectator" });
    broadcast(io);
  });

  socket.on("demo-take-seat", (ack?: (res: unknown) => void) => {
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (!sessionId) {
      ack?.({ ok: false, error: "Not in demo" });
      return;
    }
    const view = demoRoom.getView();
    const spec = view.spectators.find((s) => s.sessionId === sessionId);
    const username = spec?.username ?? "Guest";
    const result = demoRoom.joinAsPlayer(sessionId, username, socket.id);
    if (!result.ok) {
      ack?.(result);
      return;
    }
    ack?.({ ok: true, role: "player" });
    broadcast(io);
  });

  socket.on("demo-start-hand", (ack?: (res: unknown) => void) => {
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (!sessionId || !demoRoom.findPlayer(sessionId)) {
      ack?.({ ok: false, error: "Must be seated" });
      return;
    }
    const result = demoRoom.startHand(sessionId);
    ack?.(result);
    if (result.ok) broadcast(io);
  });

  socket.on("demo-action", (action: DemoAction, ack?: (res: unknown) => void) => {
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (!sessionId) {
      ack?.({ ok: false, error: "Not in demo" });
      return;
    }
    const result = demoRoom.playerAction(sessionId, action);
    ack?.(result);
    if (result.ok) broadcast(io);
  });

  socket.on("disconnect", () => {
    if (!socket.data.demoSessionId) return;
    demoRoom.disconnect(socket.id);
    broadcast(io);
  });
}

/** @deprecated use attachDemoHandlers inside connection callback */
export function registerDemoHandlers(io: Server): void {
  io.on("connection", (socket) => attachDemoHandlers(socket, io));
}
