"use client";

import { useVoiceChat } from "@/hooks/useVoiceChat";
import { Socket } from "socket.io-client";

interface Props {
  roomId: string;
  wallet: string;
  socket: React.RefObject<Socket | null>;
  embedded?: boolean;
}

export default function VoiceChat({ roomId, wallet, socket, embedded = false }: Props) {
  const { isActive, isMuted, peers, startVoice, stopVoice, toggleMute } =
    useVoiceChat(socket, roomId, wallet, true);

  if (embedded) {
    return (
      <div className="opoker-voice-panel">
        <div className="opoker-voice-icon" aria-hidden>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z"
            />
          </svg>
        </div>
        <p className="opoker-voice-title">Table voice</p>
        <p className="opoker-voice-copy">
          {isActive
            ? `Connected · ${peers.length} peer${peers.length === 1 ? "" : "s"} in channel`
            : "Push-to-talk with players at this table. Mic permission required."}
        </p>
        <div className="opoker-voice-actions">
          {!isActive ? (
            <button type="button" onClick={startVoice} className="opoker-voice-btn-primary">
              Join voice
            </button>
          ) : (
            <>
              <button type="button" onClick={toggleMute} className="opoker-voice-btn-secondary">
                {isMuted ? "Unmute" : "Mute"}
              </button>
              <button type="button" onClick={stopVoice} className="opoker-voice-btn-leave">
                Leave
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="surface-card rounded-xl p-4">
      <h3 className="section-label mb-3">Voice</h3>
      <div className="flex flex-wrap gap-2">
        {!isActive ? (
          <button type="button" onClick={startVoice} className="btn-ghost !text-xs">
            Join
          </button>
        ) : (
          <>
            <button type="button" onClick={toggleMute} className="btn-ghost !text-xs">
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button type="button" onClick={stopVoice} className="btn-ghost !text-xs !text-red-400">
              Leave
            </button>
          </>
        )}
      </div>
      {isActive && (
        <p className="mt-3 text-[10px] text-zinc-600">
          Connected to {peers.length} voice peer{peers.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
