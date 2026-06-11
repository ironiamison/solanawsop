import { io, type Socket } from "socket.io-client";
import { SOCKET_URL } from "@/lib/constants";

const SOCKET_OPTS = {
  path: "/api/socket",
  transports: ["websocket", "polling"] as ("websocket" | "polling")[],
};

/** Socket.io client — same origin when SOCKET_URL unset (local / Docker VPS). */
export function createAppSocket(extra?: { reconnectionAttempts?: number }): Socket {
  if (SOCKET_URL) {
    return io(SOCKET_URL, { ...SOCKET_OPTS, ...extra });
  }
  return io({ ...SOCKET_OPTS, ...extra });
}
