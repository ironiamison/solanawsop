"use client";

import { useEffect, useState } from "react";

const EMOJI_ONLY = /^(\p{Extended_Pictographic}|\uFE0F|\u200D)+$/u;

export default function DemoReactionFloat({
  messages,
  roomId,
}: {
  messages: { text: string; displayName: string; ts: number; roomId?: string }[];
  roomId: string;
}) {
  const [burst, setBurst] = useState<{
    emoji: string;
    name: string;
    id: number;
  } | null>(null);

  useEffect(() => {
    const last = [...messages]
      .reverse()
      .find(
        (m) =>
          (!m.roomId || m.roomId === roomId) &&
          m.text.length <= 4 &&
          EMOJI_ONLY.test(m.text.trim())
      );
    if (!last) return;
    setBurst({
      emoji: last.text.trim(),
      name: last.displayName,
      id: last.ts,
    });
    const t = window.setTimeout(() => setBurst(null), 2200);
    return () => window.clearTimeout(t);
  }, [messages, roomId]);

  if (!burst) return null;

  return (
    <div key={burst.id} className="demo-reaction-float" aria-live="polite">
      <span className="demo-reaction-float-emoji">{burst.emoji}</span>
      <span className="demo-reaction-float-name">{burst.name}</span>
    </div>
  );
}
