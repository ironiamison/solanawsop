import type { Server, Socket } from "socket.io";
import { appendDemoChat } from "@/lib/demo/chat-store";
import { DEMO_ROOM_ID } from "./constants";
import { demoRoom } from "./engine";
import { lobbyStatsFrom } from "./http-handlers";
import { newSessionId, validateUsername } from "./ids";
import { demoStoreUsesRedis, withDemoRoom } from "./store";
import type { DemoAction } from "./types";
import type { DemoRoomEngine } from "./engine";

export function lobbyStats() {
  return lobbyStatsFrom(demoRoom);
}

function broadcast(io: Server, room: DemoRoomEngine): void {
  const stats = lobbyStatsFrom(room);
  for (const [, socket] of io.sockets.sockets) {
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (sessionId) {
      socket.emit("demo-state", room.getView(sessionId));
    }
  }
  io.to(DEMO_ROOM_ID).emit("demo-lobby-stats", stats);
}

async function runRoom<T>(
  io: Server,
  fn: (room: DemoRoomEngine) => T | Promise<T>
): Promise<T> {
  if (demoStoreUsesRedis()) {
    return withDemoRoom(async (room) => {
      const result = await fn(room);
      broadcast(io, room);
      return result;
    });
  }
  const result = await fn(demoRoom);
  broadcast(io, demoRoom);
  return result;
}

export function wireDemoBroadcast(io: Server): void {
  if (!demoStoreUsesRedis()) {
    demoRoom.onStateChange(() => broadcast(io, demoRoom));
  }
  setInterval(() => {
    if (demoStoreUsesRedis()) {
      void withDemoRoom((room) => {
        if (room.checkTurnTimeout()) broadcast(io, room);
      });
      return;
    }
    if (demoRoom.checkTurnTimeout()) broadcast(io, demoRoom);
  }, 500);
}

export function attachDemoHandlers(socket: Socket, io: Server): void {
  socket.on("demo-peek", (ack?: (res: unknown) => void) => {
    void runRoom(io, (room) => {
      const stats = lobbyStatsFrom(room);
      if (typeof ack === "function") ack(stats);
      socket.emit("demo-lobby-stats", stats);
    });
  });

  socket.on(
    "demo-sync",
    (data: { sessionId?: string }, ack?: (res: unknown) => void) => {
      const sessionId = data?.sessionId;
      void runRoom(io, (room) => {
        if (!sessionId || !room.hasSession(sessionId)) {
          const err = { ok: false, error: "Session not found — join again" };
          if (typeof ack === "function") ack(err);
          socket.emit("demo-join-result", err);
          return err;
        }
        socket.join(DEMO_ROOM_ID);
        socket.data.demoSessionId = sessionId;
        socket.data.roomId = DEMO_ROOM_ID;
        room.rebindSocket(sessionId, socket.id);
        const result = { ok: true, sessionId, state: room.getView(sessionId) };
        if (typeof ack === "function") ack(result);
        socket.emit("demo-join-result", result);
        socket.emit("demo-state", room.getView(sessionId));
        return result;
      });
    }
  );

  socket.on(
    "demo-join",
    (
      data: { username: string; sessionId?: string; preferPlayer?: boolean },
      ack?: (res: unknown) => void
    ) => {
      void runRoom(io, (room) => {
        const username = validateUsername(data.username ?? "");
        if (!username) {
          const bad = { ok: false, error: "Username must be 2–16 letters, numbers, or _" };
          if (typeof ack === "function") ack(bad);
          socket.emit("demo-join-result", bad);
          return bad;
        }

        const sessionId = data.sessionId || newSessionId();
        if (room.usernameTaken(username, sessionId)) {
          const taken = { ok: false, error: "Username already taken" };
          if (typeof ack === "function") ack(taken);
          socket.emit("demo-join-result", taken);
          return taken;
        }

        socket.join(DEMO_ROOM_ID);
        socket.data.demoSessionId = sessionId;
        socket.data.roomId = DEMO_ROOM_ID;

        const wantPlayer = data.preferPlayer !== false;
        let role: "player" | "spectator" = "spectator";

        if (wantPlayer && !room.isFull()) {
          const result = room.joinAsPlayer(sessionId, username, socket.id);
          if (result.ok) {
            role = "player";
          } else {
            room.joinAsSpectator(sessionId, username, socket.id);
          }
        } else {
          room.joinAsSpectator(sessionId, username, socket.id);
          if (wantPlayer && room.isFull()) {
            const full = {
              ok: true,
              sessionId,
              role: "spectator" as const,
              wallet: sessionId,
              notice: "Table full — you're spectating. A seat opens when someone leaves.",
            };
            if (typeof ack === "function") ack(full);
            socket.emit("demo-join-result", full);
            socket.emit("demo-state", room.getView(sessionId));
            return full;
          }
        }

        const ok = { ok: true, sessionId, role, wallet: sessionId };
        if (typeof ack === "function") ack(ok);
        socket.emit("demo-join-result", ok);
        socket.emit("demo-state", room.getView(sessionId));
        return ok;
      });
    }
  );

  socket.on("demo-leave-seat", (ack?: (res: unknown) => void) => {
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (!sessionId) {
      ack?.({ ok: false, error: "Not in demo" });
      return;
    }
    void runRoom(io, (room) => {
      const seated = room.findPlayer(sessionId);
      const username = seated?.username ?? "Guest";
      const result = room.leaveSeat(sessionId);
      if (!result.ok) {
        ack?.(result);
        return result;
      }
      room.joinAsSpectator(sessionId, username, socket.id);
      ack?.({ ok: true, role: "spectator" });
      return { ok: true, role: "spectator" };
    });
  });

  socket.on("demo-take-seat", (ack?: (res: unknown) => void) => {
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (!sessionId) {
      ack?.({ ok: false, error: "Not in demo" });
      return;
    }
    void runRoom(io, (room) => {
      const view = room.getView();
      const spec = view.spectators.find((s) => s.sessionId === sessionId);
      const username = spec?.username ?? "Guest";
      const result = room.joinAsPlayer(sessionId, username, socket.id);
      if (!result.ok) {
        ack?.(result);
        return result;
      }
      ack?.({ ok: true, role: "player" });
      return { ok: true, role: "player" };
    });
  });

  socket.on("demo-start-hand", (ack?: (res: unknown) => void) => {
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (!sessionId) {
      ack?.({ ok: false, error: "Must be seated" });
      return;
    }
    void runRoom(io, (room) => {
      if (!room.findPlayer(sessionId)) {
        ack?.({ ok: false, error: "Must be seated" });
        return { ok: false, error: "Must be seated" };
      }
      const result = room.startHand(sessionId);
      ack?.(result);
      return result;
    });
  });

  socket.on("demo-action", (action: DemoAction, ack?: (res: unknown) => void) => {
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (!sessionId) {
      ack?.({ ok: false, error: "Not in demo" });
      return;
    }
    void runRoom(io, (room) => {
      const result = room.playerAction(sessionId, action);
      ack?.(result);
      return result;
    });
  });

  socket.on("disconnect", () => {
    if (!socket.data.demoSessionId) return;
    void runRoom(io, (room) => {
      room.disconnect(socket.id);
    });
  });
}

export async function handleSocketChatMessage(
  io: Server,
  msg: {
    roomId: string;
    wallet: string;
    displayName: string;
    avatar?: string;
    text: string;
  }
) {
  if (!msg.roomId || !msg.text?.trim()) return;
  const payload = await appendDemoChat({
    roomId: msg.roomId,
    wallet: msg.wallet,
    displayName: msg.displayName,
    avatar: msg.avatar,
    text: msg.text,
  });
  io.to(msg.roomId).emit("chat-message", payload);
}

/** @deprecated use attachDemoHandlers inside connection callback */
export function registerDemoHandlers(io: Server): void {
  io.on("connection", (socket) => attachDemoHandlers(socket, io));
}
