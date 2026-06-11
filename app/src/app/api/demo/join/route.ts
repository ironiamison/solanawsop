import { NextResponse } from "next/server";
import { demoRoom } from "@/lib/demo/engine";
import { newSessionId, validateUsername } from "@/lib/demo/ids";
import { lobbyStats } from "@/lib/demo/socket";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json();
  const username = validateUsername((body.username as string) ?? "");
  const preferPlayer = body.preferPlayer !== false;
  const existingSession = (body.sessionId as string) || undefined;

  if (!username) {
    return NextResponse.json(
      { ok: false, error: "Username must be 2–16 letters, numbers, or _" },
      { status: 400 }
    );
  }

  const sessionId = existingSession || newSessionId();
  if (demoRoom.usernameTaken(username, sessionId)) {
    return NextResponse.json({ ok: false, error: "Username already taken" }, { status: 409 });
  }

  // HTTP join uses a placeholder socket id; real socket replaces on demo-sync
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

  return NextResponse.json({
    ok: true,
    sessionId,
    role,
    notice,
    lobby: lobbyStats(),
    state: demoRoom.getView(sessionId),
  });
}
