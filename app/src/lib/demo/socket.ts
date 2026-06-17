import type { Server, Socket } from "socket.io";
import { withChipRoom } from "@/lib/chip-room/store";
import { appendDemoChat } from "@/lib/demo/chat-store";
import { demoRoom } from "./engine";
import {
  getDemoRoomIds,
  listDemoTables,
  lobbyStatsFrom,
  registerDemoRoom,
  resolveDemoRoomForJoin,
  resolveDemoRoomId,
} from "./lobby-registry";
import { newSessionId, validateUsername } from "./ids";
import { demoStoreUsesRedis } from "./store";
import type { DemoAction } from "./types";
import type { DemoRoomEngine } from "./engine";

function socketRoomId(socket: Socket): string | undefined {
  return socket.data.demoRoomId as string | undefined;
}

function broadcastRoom(io: Server, roomId: string, room: DemoRoomEngine): void {
  const stats = lobbyStatsFrom(room);
  for (const [, socket] of io.sockets.sockets) {
    if (socketRoomId(socket) !== roomId) continue;
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (sessionId) {
      socket.emit("demo-state", room.getView(sessionId));
    }
  }
  io.to(roomId).emit("demo-lobby-stats", stats);
}

async function runRoom<T>(
  io: Server,
  roomId: string,
  fn: (room: DemoRoomEngine) => T | Promise<T>
): Promise<T> {
  const id = await registerDemoRoom(roomId).then(() => roomId);
  return withChipRoom(id, async (room) => {
    const result = await fn(room);
    broadcastRoom(io, id, room);
    return result;
  });
}

async function runSocketRoom<T>(
  io: Server,
  socket: Socket,
  fn: (room: DemoRoomEngine) => T | Promise<T>
): Promise<T | undefined> {
  const roomId = socketRoomId(socket);
  if (!roomId) return undefined;
  return runRoom(io, roomId, fn);
}

export function wireDemoBroadcast(io: Server): void {
  if (!demoStoreUsesRedis()) {
    demoRoom.onStateChange(() => broadcastRoom(io, demoRoom.roomId, demoRoom));
  }

  setInterval(() => {
    void (async () => {
      const ids = await getDemoRoomIds();
      for (const roomId of ids) {
        await withChipRoom(roomId, (room) => {
          if (room.tick()) broadcastRoom(io, roomId, room);
        });
      }
    })();
  }, 1000);

  setInterval(() => {
    void listDemoTables().then((tables) => {
      io.emit("demo-lobby-tables", { tables });
    });
  }, 5000);
}

export function attachDemoHandlers(socket: Socket, io: Server): void {
  socket.on("demo-peek", (ack?: (res: unknown) => void) => {
    void listDemoTables().then((tables) => {
      const payload = { tables };
      if (typeof ack === "function") ack(payload);
      socket.emit("demo-lobby-tables", payload);
    });
  });

  socket.on(
    "demo-sync",
    (
      data: { sessionId?: string; roomId?: string },
      ack?: (res: unknown) => void
    ) => {
      const sessionId = data?.sessionId;
      if (!sessionId) {
        const err = { ok: false, error: "Missing session" };
        ack?.(err);
        return;
      }
      void resolveDemoRoomId(sessionId, data?.roomId).then((roomId) => {
        socket.join(roomId);
        socket.data.demoRoomId = roomId;
        socket.data.roomId = roomId;
        void runRoom(io, roomId, (room) => {
          if (!room.hasSession(sessionId)) {
            const err = { ok: false, error: "Session not found — join again" };
            ack?.(err);
            socket.emit("demo-join-result", err);
            return err;
          }
          socket.data.demoSessionId = sessionId;
          room.rebindSocket(sessionId, socket.id);
          const result = {
            ok: true,
            sessionId,
            roomId,
            state: room.getView(sessionId),
          };
          ack?.(result);
          socket.emit("demo-join-result", result);
          socket.emit("demo-state", room.getView(sessionId));
          return result;
        });
      });
    }
  );

  socket.on(
    "demo-join",
    (
      data: {
        username: string;
        sessionId?: string;
        preferPlayer?: boolean;
        roomId?: string;
      },
      ack?: (res: unknown) => void
    ) => {
      void (async () => {
        const preferPlayer = data.preferPlayer !== false;
        let roomId: string;
        if (!preferPlayer && data.roomId) {
          roomId = data.roomId;
          await registerDemoRoom(roomId);
        } else {
          roomId = await resolveDemoRoomForJoin(data.roomId);
        }

        await runRoom(io, roomId, (room) => {
          const username = validateUsername(data.username ?? "");
          if (!username) {
            const bad = {
              ok: false,
              error: "Username must be 2–16 letters, numbers, or _",
            };
            ack?.(bad);
            socket.emit("demo-join-result", bad);
            return bad;
          }

          const sessionId = data.sessionId || newSessionId();

          const reclaimed = room.reclaimSeatForUsername(sessionId, username);
          if (reclaimed) {
            socket.join(roomId);
            socket.data.demoSessionId = sessionId;
            socket.data.demoRoomId = roomId;
            socket.data.roomId = roomId;
            room.rebindSocket(sessionId, socket.id);
            const ok = {
              ok: true,
              sessionId,
              roomId,
              role: reclaimed,
              wallet: sessionId,
              notice: "Reconnected to your seat",
            };
            ack?.(ok);
            socket.emit("demo-join-result", ok);
            socket.emit("demo-state", room.getView(sessionId));
            return ok;
          }

          if (room.usernameTaken(username, sessionId)) {
            const taken = { ok: false, error: "Username already taken" };
            ack?.(taken);
            socket.emit("demo-join-result", taken);
            return taken;
          }

          socket.join(roomId);
          socket.data.demoSessionId = sessionId;
          socket.data.demoRoomId = roomId;
          socket.data.roomId = roomId;

          const wantPlayer = preferPlayer;
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
                roomId,
                role: "spectator" as const,
                wallet: sessionId,
                notice:
                  "Table full — you're spectating. A seat opens when someone leaves.",
              };
              ack?.(full);
              socket.emit("demo-join-result", full);
              socket.emit("demo-state", room.getView(sessionId));
              return full;
            }
          }

          const ok = { ok: true, sessionId, roomId, role, wallet: sessionId };
          ack?.(ok);
          socket.emit("demo-join-result", ok);
          socket.emit("demo-state", room.getView(sessionId));
          return ok;
        });
      })();
    }
  );

  socket.on("demo-leave-seat", (ack?: (res: unknown) => void) => {
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (!sessionId) {
      ack?.({ ok: false, error: "Not in demo" });
      return;
    }
    void runSocketRoom(io, socket, (room) => {
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
    void runSocketRoom(io, socket, (room) => {
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

  socket.on("demo-sit-out", (sitOut: boolean, ack?: (res: unknown) => void) => {
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (!sessionId) {
      ack?.({ ok: false, error: "Must be seated" });
      return;
    }
    void runSocketRoom(io, socket, (room) => {
      if (!room.findPlayer(sessionId)) {
        ack?.({ ok: false, error: "Must be seated" });
        return { ok: false, error: "Must be seated" };
      }
      const result = room.setSitOut(sessionId, sitOut);
      ack?.(result);
      return result;
    });
  });

  socket.on("demo-start-hand", (ack?: (res: unknown) => void) => {
    const sessionId = socket.data.demoSessionId as string | undefined;
    if (!sessionId) {
      ack?.({ ok: false, error: "Must be seated" });
      return;
    }
    void runSocketRoom(io, socket, (room) => {
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
    void runSocketRoom(io, socket, (room) => {
      const result = room.playerAction(sessionId, action);
      ack?.(result);
      return result;
    });
  });

  socket.on("disconnect", () => {
    const roomId = socketRoomId(socket);
    if (!roomId || !socket.data.demoSessionId) return;
    void runRoom(io, roomId, (room) => {
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
