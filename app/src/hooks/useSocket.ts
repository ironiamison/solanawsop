"use client";

import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { createAppSocket } from "@/lib/socket-client";

export interface ChatMessage {
  roomId: string;
  wallet: string;
  displayName: string;
  avatar?: string;
  text: string;
  ts: number;
}

export function useSocket(roomId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    if (!roomId) return;

    const socket = createAppSocket();
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join-room", roomId);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("chat-message", (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-99), msg]);
    });

    return () => {
      socket.emit("leave-room", roomId);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
      setMessages([]);
    };
  }, [roomId]);

  const sendMessage = (msg: Omit<ChatMessage, "ts">) => {
    socketRef.current?.emit("chat-message", msg);
  };

  return { connected, messages, sendMessage, socket: socketRef };
}
