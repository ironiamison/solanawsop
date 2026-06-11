import { demoRoom } from "@/lib/demo/engine";
import { newSessionId, validateUsername } from "@/lib/demo/ids";
import { lobbyStats } from "@/lib/demo/socket";
import type { DemoAction } from "@/lib/demo/types";

export function handleDemoLobby() {
  return lobbyStats();
}

export function handleDemoState(sessionId?: string) {
  if (sessionId && !demoRoom.hasSession(sessionId)) {
    return { ok: false as const, error: "Session not found", status: 404 };
  }
  if (demoRoom.checkTurnTimeout()) {
    // fresh view returned below
  }
  return {
    ok: true as const,
    state: demoRoom.getView(sessionId),
    lobby: lobbyStats(),
    status: 200,
  };
}

export function handleDemoJoin(body: {
  username?: string;
  preferPlayer?: boolean;
  sessionId?: string;
}) {
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
  if (demoRoom.usernameTaken(username, sessionId)) {
    return { ok: false as const, error: "Username already taken", status: 409 };
  }

  const placeholderSocket = `http-${sessionId}`;
  let role: "player" | "spectator" = "spectator";
  let notice: string | undefined;

  if (preferPlayer && !demoRoom.isFull()) {
    const result = demoRoom.joinAsPlayer(sessionId, username, placeholderSocket);
    if (result.ok) {
      role = "player";
    } else {
      demoRoom.joinAsSpectator(sessionId, username, placeholderSocket);
    }
  } else {
    demoRoom.joinAsSpectator(sessionId, username, placeholderSocket);
    if (preferPlayer && demoRoom.isFull()) {
      notice = "Table full — you're spectating. A seat opens when someone leaves.";
    }
  }

  return {
    ok: true as const,
    sessionId,
    role,
    notice,
    lobby: lobbyStats(),
    state: demoRoom.getView(sessionId),
    status: 200,
  };
}

export function handleDemoAction(sessionId: string, action: DemoAction | undefined) {
  if (!sessionId || !demoRoom.hasSession(sessionId)) {
    return { ok: false as const, error: "Not in demo", status: 400 };
  }
  if (!action?.type) {
    return { ok: false as const, error: "Invalid action", status: 400 };
  }
  const result = demoRoom.playerAction(sessionId, action);
  return {
    ...result,
    state: demoRoom.getView(sessionId),
    lobby: lobbyStats(),
    status: result.ok ? 200 : 400,
  };
}

export function handleDemoLeaveSeat(sessionId: string) {
  if (!sessionId || !demoRoom.hasSession(sessionId)) {
    return { ok: false as const, error: "Not in demo", status: 400 };
  }
  const seated = demoRoom.findPlayer(sessionId);
  const username = seated?.username ?? "Guest";
  const result = demoRoom.leaveSeat(sessionId);
  if (!result.ok) {
    return { ...result, status: 400 };
  }
  demoRoom.joinAsSpectator(sessionId, username, `http-${sessionId}`);
  return {
    ok: true as const,
    role: "spectator" as const,
    state: demoRoom.getView(sessionId),
    lobby: lobbyStats(),
    status: 200,
  };
}

export function handleDemoTakeSeat(sessionId: string) {
  if (!sessionId || !demoRoom.hasSession(sessionId)) {
    return { ok: false as const, error: "Not in demo", status: 400 };
  }
  const view = demoRoom.getView();
  const spec = view.spectators.find((s) => s.sessionId === sessionId);
  const username = spec?.username ?? "Guest";
  const result = demoRoom.joinAsPlayer(sessionId, username, `http-${sessionId}`);
  if (!result.ok) {
    return { ...result, status: 400 };
  }
  return {
    ok: true as const,
    role: "player" as const,
    state: demoRoom.getView(sessionId),
    lobby: lobbyStats(),
    status: 200,
  };
}

export function handleDemoStartHand(sessionId: string) {
  if (!sessionId || !demoRoom.findPlayer(sessionId)) {
    return { ok: false as const, error: "Must be seated", status: 400 };
  }
  const result = demoRoom.startHand(sessionId);
  return {
    ...result,
    state: demoRoom.getView(sessionId),
    lobby: lobbyStats(),
    status: result.ok ? 200 : 400,
  };
}
