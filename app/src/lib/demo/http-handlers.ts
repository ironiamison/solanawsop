import { appendDemoChat, listDemoChat } from "@/lib/demo/chat-store";
import type { DemoRoomEngine } from "@/lib/demo/engine";
import { withChipRoom } from "@/lib/chip-room/store";
import { newSessionId, validateUsername } from "@/lib/demo/ids";
import {
  findDemoRoomForSession,
  listDemoTables,
  lobbyStatsFrom,
  normalizeDemoRoomId,
  registerDemoRoom,
  resolveDemoRoomForJoin,
  resolveDemoRoomId,
} from "@/lib/demo/lobby-registry";
import type { DemoAction } from "@/lib/demo/types";

export { lobbyStatsFrom };

function withDemoRoomId<T>(
  roomId: string,
  fn: (room: DemoRoomEngine) => T | Promise<T>
): Promise<T> {
  const id = normalizeDemoRoomId(roomId);
  return withChipRoom(id, async (room) => {
    await registerDemoRoom(id);
    return fn(room);
  });
}

export async function handleDemoLobby() {
  const tables = await listDemoTables();
  return { tables };
}

export async function handleDemoState(
  sessionId: string | undefined,
  roomId?: string
) {
  const id = await resolveDemoRoomId(sessionId, roomId);
  if (sessionId && !roomId) {
    const found = await findDemoRoomForSession(sessionId);
    if (!found) {
      return { ok: false as const, error: "Session not found", status: 404 };
    }
  }
  return withDemoRoomId(id, (room) => {
    if (sessionId && !room.hasSession(sessionId)) {
      return { ok: false as const, error: "Session not found", status: 404 };
    }
    return {
      ok: true as const,
      roomId: id,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: 200,
    };
  });
}

export async function handleDemoJoin(body: {
  username?: string;
  preferPlayer?: boolean;
  sessionId?: string;
  roomId?: string;
}) {
  const preferPlayer = body.preferPlayer !== false;
  let targetRoomId: string;
  if (!preferPlayer && body.roomId) {
    targetRoomId = normalizeDemoRoomId(body.roomId);
    await registerDemoRoom(targetRoomId);
  } else {
    targetRoomId = await resolveDemoRoomForJoin(body.roomId);
  }

  return withDemoRoomId(targetRoomId, (room) => {
    const username = validateUsername((body.username as string) ?? "");
    const existingSession = body.sessionId || undefined;

    if (!username) {
      return {
        ok: false as const,
        error: "Username must be 2–16 letters, numbers, or _",
        status: 400,
      };
    }

    const sessionId = existingSession || newSessionId();
    const placeholderSocket = `http-${sessionId}`;
    let role: "player" | "spectator" = "spectator";
    let notice: string | undefined;

    const reclaimed = room.reclaimSeatForUsername(sessionId, username);
    if (reclaimed) {
      room.rebindSocket(sessionId, placeholderSocket);
      return {
        ok: true as const,
        sessionId,
        roomId: room.roomId,
        role: reclaimed,
        notice: "Reconnected to your seat",
        lobby: lobbyStatsFrom(room),
        state: room.getView(sessionId),
        status: 200,
      };
    }

    if (room.usernameTaken(username, sessionId)) {
      return { ok: false as const, error: "Username already taken", status: 409 };
    }

    if (preferPlayer && !room.isFull()) {
      const result = room.joinAsPlayer(sessionId, username, placeholderSocket);
      if (result.ok) {
        role = "player";
      } else {
        room.joinAsSpectator(sessionId, username, placeholderSocket);
      }
    } else {
      room.joinAsSpectator(sessionId, username, placeholderSocket);
      if (preferPlayer && room.isFull()) {
        notice = "Table full — you're spectating. A seat opens when someone leaves.";
      }
    }

    return {
      ok: true as const,
      sessionId,
      roomId: room.roomId,
      role,
      notice,
      lobby: lobbyStatsFrom(room),
      state: room.getView(sessionId),
      status: 200,
    };
  });
}

export async function handleDemoAction(
  sessionId: string,
  action: DemoAction | undefined,
  roomId?: string
) {
  const id = await resolveDemoRoomId(sessionId, roomId);
  return withDemoRoomId(id, (room) => {
    if (!sessionId || !room.hasSession(sessionId)) {
      return { ok: false as const, error: "Not in demo", status: 400 };
    }
    if (!action?.type) {
      return { ok: false as const, error: "Invalid action", status: 400 };
    }
    const result = room.playerAction(sessionId, action);
    return {
      ...result,
      roomId: room.roomId,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: result.ok ? 200 : 400,
    };
  });
}

export async function handleDemoLeaveSeat(sessionId: string, roomId?: string) {
  const id = await resolveDemoRoomId(sessionId, roomId);
  return withDemoRoomId(id, (room) => {
    if (!sessionId || !room.hasSession(sessionId)) {
      return { ok: false as const, error: "Not in demo", status: 400 };
    }
    const seated = room.findPlayer(sessionId);
    const username = seated?.username ?? "Guest";
    const result = room.leaveSeat(sessionId);
    if (!result.ok) {
      return { ...result, status: 400 };
    }
    room.joinAsSpectator(sessionId, username, `http-${sessionId}`);
    return {
      ok: true as const,
      role: "spectator" as const,
      roomId: room.roomId,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: 200,
    };
  });
}

export async function handleDemoTakeSeat(sessionId: string, roomId?: string) {
  const id = await resolveDemoRoomId(sessionId, roomId);
  return withDemoRoomId(id, (room) => {
    if (!sessionId || !room.hasSession(sessionId)) {
      return { ok: false as const, error: "Not in demo", status: 400 };
    }
    const view = room.getView();
    const spec = view.spectators.find((s) => s.sessionId === sessionId);
    const username = spec?.username ?? "Guest";
    const result = room.joinAsPlayer(sessionId, username, `http-${sessionId}`);
    if (!result.ok) {
      return { ...result, status: 400 };
    }
    return {
      ok: true as const,
      role: "player" as const,
      roomId: room.roomId,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: 200,
    };
  });
}

export async function handleDemoSitOut(
  sessionId: string,
  sitOut: boolean,
  roomId?: string
) {
  const id = await resolveDemoRoomId(sessionId, roomId);
  return withDemoRoomId(id, (room) => {
    if (!sessionId || !room.findPlayer(sessionId)) {
      return { ok: false as const, error: "Must be seated", status: 400 };
    }
    const result = room.setSitOut(sessionId, sitOut);
    return {
      ...result,
      sitOut,
      roomId: room.roomId,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: result.ok ? 200 : 400,
    };
  });
}

export async function handleDemoStartHand(sessionId: string, roomId?: string) {
  const id = await resolveDemoRoomId(sessionId, roomId);
  return withDemoRoomId(id, (room) => {
    if (!sessionId || !room.findPlayer(sessionId)) {
      return { ok: false as const, error: "Must be seated", status: 400 };
    }
    const result = room.startHand(sessionId);
    return {
      ...result,
      roomId: room.roomId,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: result.ok ? 200 : 400,
    };
  });
}

export async function handleDemoChatList(since = 0) {
  const messages = await listDemoChat(since);
  return { ok: true as const, messages };
}

export async function handleDemoChatSend(body: {
  sessionId?: string;
  roomId?: string;
  text?: string;
  displayName?: string;
  avatar?: string;
}) {
  const sessionId = body.sessionId ?? "";
  const roomId = normalizeDemoRoomId(body.roomId);
  const text = (body.text ?? "").trim();
  const displayName = (body.displayName ?? "").trim();

  if (!sessionId || !text || !displayName) {
    return { ok: false as const, error: "Invalid message", status: 400 };
  }

  const inRoom = await withDemoRoomId(roomId, (room) => room.hasSession(sessionId));
  if (!inRoom) {
    return { ok: false as const, error: "Not in demo", status: 400 };
  }

  const message = await appendDemoChat({
    roomId,
    wallet: sessionId,
    displayName,
    avatar: body.avatar,
    text,
  });
  return { ok: true as const, message, status: 200 };
}
