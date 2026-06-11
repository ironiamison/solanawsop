"use client";

import { useEffect, useRef, useState } from "react";
import { ChatMessage } from "@/hooks/useSocket";
import PlayerAvatar from "@/components/social/PlayerAvatar";

interface Props {
  connected: boolean;
  messages: ChatMessage[];
  onSend: (text: string) => void;
  wallet: string;
  embedded?: boolean;
}

export default function ChatPanel({
  connected,
  messages,
  onSend,
  wallet,
  embedded = false,
}: Props) {
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };

  return (
    <div
      className={`flex h-full flex-col overflow-hidden ${embedded ? "opoker-chat-panel" : "surface-card rounded-xl"}`}
    >
      {!embedded && (
        <div className="border-b border-white/[0.06] px-4 py-3">
          <h3 className="section-label">Chat</h3>
          <p className="text-[10px] text-zinc-600">
            {connected ? "Live" : "Connecting…"}
          </p>
        </div>
      )}

      <div className="opoker-chat-scroll flex-1 space-y-1.5 overflow-y-auto px-2.5 py-2">
        {messages.length === 0 && (
          <p className="py-4 text-center text-[11px] text-zinc-600">
            {connected ? "Say hello to the table" : "Connecting to chat…"}
          </p>
        )}
        {messages.map((m, i) => {
          const mine = m.wallet === wallet;
          return (
            <div
              key={`${m.ts}-${i}`}
              className={`opoker-chat-bubble ${mine ? "opoker-chat-bubble-mine" : "opoker-chat-bubble-theirs"}`}
            >
              {!mine && (
                <div className="mb-1 flex items-center gap-1.5">
                  <PlayerAvatar
                    seed={m.displayName}
                    name={m.displayName}
                    image={m.avatar}
                    size="sm"
                  />
                  <span className="truncate text-[10px] font-semibold text-zinc-500">
                    {m.displayName}
                  </span>
                </div>
              )}
              <p className="text-[12px] leading-snug text-zinc-200">{m.text}</p>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="opoker-chat-form border-t border-white/[0.06] p-2">
        <div className="flex gap-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={connected ? "Type a message…" : "Connecting…"}
            maxLength={280}
            disabled={!connected}
            className="opoker-chat-input flex-1"
          />
          <button
            type="submit"
            disabled={!connected || !text.trim()}
            className="opoker-chat-send"
            aria-label="Send message"
          >
            →
          </button>
        </div>
      </form>
    </div>
  );
}
