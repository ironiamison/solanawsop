import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import {
  attachDemoHandlers,
  handleSocketChatMessage,
  lobbyStats,
  wireDemoBroadcast,
} from "@/lib/demo/socket";
import { DEMO_ROOM_ID } from "@/lib/demo/constants";
import { allowedSocketOrigins } from "@/lib/socket/origins";

interface ChatMessage {
  roomId: string;
  wallet: string;
  displayName: string;
  avatar?: string;
  text: string;
  ts: number;
}

/** Attach Socket.io game server (demo table, chat, voice) to an HTTP server. */
export function createGameIo(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: allowedSocketOrigins(), methods: ["GET", "POST"] },
    path: "/api/socket",
  });

  wireDemoBroadcast(io);

  io.on("connection", (socket) => {
    attachDemoHandlers(socket, io);

    socket.on("join-room", (roomId: string) => {
      socket.join(roomId);
      socket.data.roomId = roomId;
      if (roomId === DEMO_ROOM_ID) {
        socket.emit("demo-lobby-stats", lobbyStats());
      }
    });

    socket.on("leave-room", (roomId: string) => {
      socket.leave(roomId);
    });

    socket.on("chat-message", (msg: ChatMessage) => {
      void handleSocketChatMessage(io, msg);
    });

    socket.on(
      "voice-signal",
      (data: {
        roomId: string;
        to?: string;
        signal: unknown;
        fromWallet: string;
      }) => {
        if (!data.roomId) return;
        if (data.to) {
          socket.to(data.to).emit("voice-signal", {
            signal: data.signal,
            from: socket.id,
            fromWallet: data.fromWallet,
          });
        } else {
          socket.to(data.roomId).emit("voice-signal", {
            signal: data.signal,
            from: socket.id,
            fromWallet: data.fromWallet,
          });
        }
      }
    );

    socket.on("voice-join", (data: { roomId: string; wallet: string }) => {
      socket.join(data.roomId);
      socket.to(data.roomId).emit("voice-peer-joined", {
        peerId: socket.id,
        wallet: data.wallet,
      });
    });

    socket.on("disconnect", () => {
      const roomId = socket.data.roomId as string | undefined;
      if (roomId) {
        socket.to(roomId).emit("voice-peer-left", { peerId: socket.id });
      }
    });
  });

  return io;
}
