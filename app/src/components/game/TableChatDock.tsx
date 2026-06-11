"use client";

import { useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import { ChatMessage } from "@/hooks/useSocket";
import VoiceChat from "@/components/VoiceChat";
import type { Socket } from "socket.io-client";
import type { RefObject } from "react";
import TableNotesPanel from "@/components/game/TableNotesPanel";

type Tab = "chat" | "voice" | "notes";

export default function TableChatDock({
  connected,
  messages,
  wallet,
  onSend,
  roomId,
  socket,
  showVoice = true,
}: {
  connected: boolean;
  messages: ChatMessage[];
  wallet: string;
  onSend: (text: string) => void;
  roomId: string;
  socket?: RefObject<Socket | null>;
  showVoice?: boolean;
}) {
  const [tab, setTab] = useState<Tab>("chat");

  const tabs = (
    [
      { id: "chat" as Tab, label: "Chat" },
      showVoice ? { id: "voice" as Tab, label: "Voice" } : null,
      { id: "notes" as Tab, label: "Notes" },
    ] as const
  ).filter(Boolean) as { id: Tab; label: string }[];

  return (
    <div className="opoker-chat-dock flex h-full flex-col">
      <div className="opoker-chat-tabs flex shrink-0 items-center border-b border-white/[0.06] px-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`opoker-chat-tab ${tab === t.id ? "opoker-chat-tab-active" : ""}`}
          >
            {t.label}
            {t.id === "chat" && (
              <span
                className={`opoker-chat-live-dot ${connected ? "opoker-chat-live-dot-on" : ""}`}
                aria-hidden
              />
            )}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "chat" && (
          <ChatPanel
            connected={connected}
            messages={messages}
            wallet={wallet}
            onSend={onSend}
            embedded
          />
        )}
        {tab === "voice" && showVoice && socket && (
          <VoiceChat roomId={roomId} wallet={wallet} socket={socket} embedded />
        )}
        {tab === "notes" && <TableNotesPanel roomId={roomId} />}
      </div>
    </div>
  );
}
