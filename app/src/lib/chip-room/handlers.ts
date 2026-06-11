import type { DemoRoomEngine } from "@/lib/demo/engine";
import { newSessionId, validateUsername } from "@/lib/demo/ids";
import type { DemoAction } from "@/lib/demo/types";
import { withChipRoom } from "./store";

export function lobbyStatsFrom(room: DemoRoomEngine) {
  const view = room.getView();
  return {
    playerCount: view.playerCount,
    spectators: view.spectators.length,
    isFull: room.isFull(),
    maxPlayers: 6,
  };
}

export async function handleChipRoomJoin(
  roomId: string,
  body: {
    username?: string;
    preferPlayer?: boolean;
    sessionId?: string;
    startStack?: number;
    canJoin?: (room: DemoRoomEngine, sessionId: string) => boolean | string;
    onJoined?: (room: DemoRoomEngine, sessionId: string, role: "player" | "spectator") => void;
  }
) {
  return withChipRoom(
    roomId,
    (room) => {
      const username = validateUsername((body.username as string) ?? "");
      const preferPlayer = body.preferPlayer !== false;
      const existingSession = body.sessionId || undefined;

      if (!username) {
        return {
          ok: false as const,
          error: "Username must be 2–16 letters, numbers, or _",
          status: 400,
        };
      }

      const sessionId = existingSession || newSessionId();
      if (room.usernameTaken(username, sessionId)) {
        return { ok: false as const, error: "Username already taken", status: 409 };
      }

      if (body.canJoin) {
        const gate = body.canJoin(room, sessionId);
        if (gate !== true) {
          return {
            ok: false as const,
            error: typeof gate === "string" ? gate : "Not allowed at this table",
            status: 403,
          };
        }
      }

      const placeholderSocket = `http-${sessionId}`;
      let role: "player" | "spectator" = "spectator";
      let notice: string | undefined;

      if (preferPlayer && !room.isFull()) {
        const result = room.joinAsPlayer(sessionId, username, placeholderSocket);
        if (result.ok) {
          role = "player";
        } else {
          room.joinAsSpectator(sessionId, username, placeholderSocket);
          notice = result.error;
        }
      } else {
        room.joinAsSpectator(sessionId, username, placeholderSocket);
        if (preferPlayer && room.isFull()) {
          notice = "Table full — you're spectating.";
        }
      }

      body.onJoined?.(room, sessionId, role);

      return {
        ok: true as const,
        sessionId,
        role,
        notice,
        lobby: lobbyStatsFrom(room),
        state: room.getView(sessionId),
        status: 200,
      };
    },
    { startStack: body.startStack }
  );
}

export async function handleChipRoomState(roomId: string, sessionId?: string) {
  return withChipRoom(roomId, (room) => {
    if (sessionId && !room.hasSession(sessionId)) {
      return { ok: false as const, error: "Session not found", status: 404 };
    }
    return {
      ok: true as const,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: 200,
    };
  });
}

export async function handleChipRoomAction(
  roomId: string,
  sessionId: string,
  action: DemoAction | undefined,
  afterAction?: (room: DemoRoomEngine) => void
) {
  return withChipRoom(roomId, (room) => {
    if (!sessionId || !room.hasSession(sessionId)) {
      return { ok: false as const, error: "Not in room", status: 400 };
    }
    if (!action?.type) {
      return { ok: false as const, error: "Invalid action", status: 400 };
    }
    const result = room.playerAction(sessionId, action);
    if (result.ok) afterAction?.(room);
    return {
      ...result,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: result.ok ? 200 : 400,
    };
  });
}

export async function handleChipRoomLeaveSeat(roomId: string, sessionId: string) {
  return withChipRoom(roomId, (room) => {
    if (!sessionId || !room.hasSession(sessionId)) {
      return { ok: false as const, error: "Not in room", status: 400 };
    }
    const seated = room.findPlayer(sessionId);
    const username = seated?.username ?? "Guest";
    const result = room.leaveSeat(sessionId);
    if (!result.ok) return { ...result, status: 400 };
    room.joinAsSpectator(sessionId, username, `http-${sessionId}`);
    return {
      ok: true as const,
      role: "spectator" as const,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: 200,
    };
  });
}

export async function handleChipRoomTakeSeat(roomId: string, sessionId: string) {
  return withChipRoom(roomId, (room) => {
    if (!sessionId || !room.hasSession(sessionId)) {
      return { ok: false as const, error: "Not in room", status: 400 };
    }
    const view = room.getView();
    const spec = view.spectators.find((s) => s.sessionId === sessionId);
    const username = spec?.username ?? "Guest";
    const result = room.joinAsPlayer(sessionId, username, `http-${sessionId}`);
    if (!result.ok) return { ...result, status: 400 };
    return {
      ok: true as const,
      role: "player" as const,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: 200,
    };
  });
}

export async function handleChipRoomSitOut(
  roomId: string,
  sessionId: string,
  sitOut: boolean
) {
  return withChipRoom(roomId, (room) => {
    if (!sessionId || !room.findPlayer(sessionId)) {
      return { ok: false as const, error: "Must be seated", status: 400 };
    }
    const result = room.setSitOut(sessionId, sitOut);
    return {
      ...result,
      sitOut,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: result.ok ? 200 : 400,
    };
  });
}
