import { appendDemoChat, listDemoChat } from "@/lib/demo/chat-store";
import type { DemoRoomEngine } from "@/lib/demo/engine";
import { newSessionId, validateUsername } from "@/lib/demo/ids";
import { withDemoRoom } from "@/lib/demo/store";
import type { DemoAction } from "@/lib/demo/types";

export function lobbyStatsFrom(room: DemoRoomEngine) {
  const view = room.getView();
  return {
    playerCount: view.playerCount,
    spectators: view.spectators.length,
    isFull: room.isFull(),
    maxPlayers: 6,
  };
}

export async function handleDemoLobby() {
  return withDemoRoom((room) => lobbyStatsFrom(room));
}

export async function handleDemoState(sessionId?: string) {
  return withDemoRoom((room) => {
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

export async function handleDemoJoin(body: {
  username?: string;
  preferPlayer?: boolean;
  sessionId?: string;
}) {
  return withDemoRoom((room) => {
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

    const placeholderSocket = `http-${sessionId}`;
    let role: "player" | "spectator" = "spectator";
    let notice: string | undefined;

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
  action: DemoAction | undefined
) {
  return withDemoRoom((room) => {
    if (!sessionId || !room.hasSession(sessionId)) {
      return { ok: false as const, error: "Not in demo", status: 400 };
    }
    if (!action?.type) {
      return { ok: false as const, error: "Invalid action", status: 400 };
    }
    const result = room.playerAction(sessionId, action);
    return {
      ...result,
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: result.ok ? 200 : 400,
    };
  });
}

export async function handleDemoLeaveSeat(sessionId: string) {
  return withDemoRoom((room) => {
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
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: 200,
    };
  });
}

export async function handleDemoTakeSeat(sessionId: string) {
  return withDemoRoom((room) => {
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
      state: room.getView(sessionId),
      lobby: lobbyStatsFrom(room),
      status: 200,
    };
  });
}

export async function handleDemoSitOut(sessionId: string, sitOut: boolean) {
  return withDemoRoom((room) => {
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

export async function handleDemoStartHand(sessionId: string) {
  return withDemoRoom((room) => {
    if (!sessionId || !room.findPlayer(sessionId)) {
      return { ok: false as const, error: "Must be seated", status: 400 };
    }
    const result = room.startHand(sessionId);
    return {
      ...result,
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
  text?: string;
  displayName?: string;
  avatar?: string;
}) {
  const sessionId = body.sessionId ?? "";
  const text = (body.text ?? "").trim();
  const displayName = (body.displayName ?? "").trim();

  if (!sessionId || !text || !displayName) {
    return { ok: false as const, error: "Invalid message", status: 400 };
  }

  const inRoom = await withDemoRoom((room) => room.hasSession(sessionId));
  if (!inRoom) {
    return { ok: false as const, error: "Not in demo", status: 400 };
  }

  const message = await appendDemoChat({
    wallet: sessionId,
    displayName,
    avatar: body.avatar,
    text,
  });
  return { ok: true as const, message, status: 200 };
}
