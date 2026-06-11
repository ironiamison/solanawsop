/**
 * Standalone game server for production (Railway, Render, VPS).
 * Runs Socket.io + demo HTTP API on one process so table state stays in sync
 * when the Next.js frontend is hosted on Vercel.
 *
 * Set NEXT_PUBLIC_SOCKET_URL on Vercel to this service's public URL.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "http";
import { createGameIo } from "./src/lib/socket/create-io";
import {
  handleDemoAction,
  handleDemoJoin,
  handleDemoLeaveSeat,
  handleDemoLobby,
  handleDemoChatList,
  handleDemoChatSend,
  handleDemoSitOut,
  handleDemoStartHand,
  handleDemoState,
  handleDemoTakeSeat,
} from "./src/lib/demo/http-handlers";
import { isAllowedOrigin } from "./src/lib/socket/origins";
import type { DemoAction } from "./src/lib/demo/types";

const host = process.env.HOST ?? "0.0.0.0";
const port = parseInt(process.env.PORT || "3000", 10);

function corsHeaders(origin: string | undefined): Record<string, string> {
  if (!isAllowedOrigin(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin!,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    Vary: "Origin",
  };
}

function sendJson(
  res: ServerResponse,
  status: number,
  body: unknown,
  origin?: string
) {
  const headers = {
    "Content-Type": "application/json",
    ...corsHeaders(origin),
  };
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

async function readJson<T>(req: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? (JSON.parse(raw) as T) : ({} as T);
}

async function handleDemoHttp(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  origin?: string
) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders(origin));
    res.end();
    return;
  }

  try {
    if (pathname === "/api/demo/lobby" && req.method === "GET") {
      sendJson(res, 200, await handleDemoLobby(), origin);
      return;
    }

    if (pathname === "/api/demo/chat" && req.method === "GET") {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const since = Number(url.searchParams.get("since") ?? "0");
      sendJson(res, 200, await handleDemoChatList(Number.isFinite(since) ? since : 0), origin);
      return;
    }

    if (pathname === "/api/demo/chat" && req.method === "POST") {
      const body = await readJson<{
        sessionId?: string;
        text?: string;
        displayName?: string;
        avatar?: string;
      }>(req);
      const result = await handleDemoChatSend(body);
      sendJson(res, result.status, result, origin);
      return;
    }

    if (pathname === "/api/demo/state" && req.method === "GET") {
      const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
      const sessionId = url.searchParams.get("sessionId") ?? undefined;
      const result = await handleDemoState(sessionId);
      if (!result.ok) {
        sendJson(res, result.status, { ok: false, error: result.error }, origin);
        return;
      }
      sendJson(res, 200, result, origin);
      return;
    }

    if (pathname === "/api/demo/join" && req.method === "POST") {
      const body = await readJson<{
        username?: string;
        preferPlayer?: boolean;
        sessionId?: string;
      }>(req);
      const result = await handleDemoJoin(body);
      sendJson(res, result.status, result, origin);
      return;
    }

    if (pathname === "/api/demo/action" && req.method === "POST") {
      const body = await readJson<{ sessionId?: string; action?: DemoAction }>(req);
      const result = await handleDemoAction(body.sessionId ?? "", body.action);
      sendJson(res, result.status, result, origin);
      return;
    }

    if (pathname === "/api/demo/leave-seat" && req.method === "POST") {
      const body = await readJson<{ sessionId?: string }>(req);
      const result = await handleDemoLeaveSeat(body.sessionId ?? "");
      sendJson(res, result.status, result, origin);
      return;
    }

    if (pathname === "/api/demo/take-seat" && req.method === "POST") {
      const body = await readJson<{ sessionId?: string }>(req);
      const result = await handleDemoTakeSeat(body.sessionId ?? "");
      sendJson(res, result.status, result, origin);
      return;
    }

    if (pathname === "/api/demo/sit-out" && req.method === "POST") {
      const body = await readJson<{ sessionId?: string; sitOut?: boolean }>(req);
      const result = await handleDemoSitOut(
        body.sessionId ?? "",
        Boolean(body.sitOut)
      );
      sendJson(res, result.status, result, origin);
      return;
    }

    if (pathname === "/api/demo/start-hand" && req.method === "POST") {
      const body = await readJson<{ sessionId?: string }>(req);
      const result = await handleDemoStartHand(body.sessionId ?? "");
      sendJson(res, result.status, result, origin);
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found" }, origin);
  } catch {
    sendJson(res, 500, { ok: false, error: "Server error" }, origin);
  }
}

const httpServer = createServer(async (req, res) => {
  const origin = req.headers.origin;
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === "/health" && req.method === "GET") {
    sendJson(res, 200, { ok: true, service: "solanawsop-socket" }, origin);
    return;
  }

  if (pathname.startsWith("/api/demo/")) {
    await handleDemoHttp(req, res, pathname, origin);
    return;
  }

  sendJson(res, 404, { ok: false, error: "Socket server — use /api/socket" }, origin);
});

createGameIo(httpServer);

httpServer.listen(port, host, () => {
  console.log(`> SolanaWSOP socket server on http://${host}:${port}`);
  console.log(`> Socket path: /api/socket`);
});
