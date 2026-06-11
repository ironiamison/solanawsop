import { createServer } from "http";
import { parse } from "url";
import next from "next";
import { Server } from "socket.io";
import { attachDemoHandlers, lobbyStats, wireDemoBroadcast } from "./src/lib/demo/socket";
import { DEMO_ROOM_ID } from "./src/lib/demo/constants";

const dev = process.env.NODE_ENV !== "production";
const host = process.env.HOST ?? (dev ? "localhost" : "0.0.0.0");
const port = parseInt(process.env.PORT || (dev ? "3001" : "3000"), 10);

const app = next({ dev, hostname: host, port });
const handle = app.getRequestHandler();

interface ChatMessage {
  roomId: string;
  wallet: string;
  displayName: string;
  avatar?: string;
  text: string;
  ts: number;
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
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
      if (!msg.roomId || !msg.text?.trim()) return;
      const payload = { ...msg, ts: Date.now() };
      io.to(msg.roomId).emit("chat-message", payload);
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

  server.listen(port, host, () => {
    const shown = host === "0.0.0.0" ? `http://localhost:${port}` : `http://${host}:${port}`;
    console.log(`> Solana Poker ready on ${shown}`);
  });
});
