"use client";

import type { BotDifficulty } from "@/lib/demo/types";

const QUICK_LINES = [
  "Nice hand",
  "GG",
  "Ship it",
  "Tough beat",
  "Let's go",
];

const REACTIONS = ["🔥", "👏", "😂", "🫡", "💀", "🚢"];

export default function DemoTableVibes({
  onSend,
  botDifficulty,
  onBotDifficultyChange,
  soundEnabled,
  onSoundToggle,
  disabled,
}: {
  onSend: (text: string) => void;
  botDifficulty: BotDifficulty;
  onBotDifficultyChange: (d: BotDifficulty) => void;
  soundEnabled: boolean;
  onSoundToggle: (on: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="demo-table-vibes">
      <div className="demo-table-vibes-row">
        <span className="demo-table-vibes-label">Quick</span>
        <div className="demo-table-vibes-chips">
          {QUICK_LINES.map((line) => (
            <button
              key={line}
              type="button"
              disabled={disabled}
              className="demo-vibe-chip"
              onClick={() => onSend(line)}
            >
              {line}
            </button>
          ))}
        </div>
      </div>
      <div className="demo-table-vibes-row">
        <span className="demo-table-vibes-label">React</span>
        <div className="demo-table-vibes-chips">
          {REACTIONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              disabled={disabled}
              className="demo-vibe-emoji"
              onClick={() => onSend(emoji)}
              aria-label={`React ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
      <div className="demo-table-vibes-row demo-table-vibes-row--settings">
        <label className="demo-table-vibes-label" htmlFor="bot-difficulty">
          Bots
        </label>
        <select
          id="bot-difficulty"
          className="demo-bot-difficulty"
          value={botDifficulty}
          disabled={disabled}
          onChange={(e) =>
            onBotDifficultyChange(e.target.value as BotDifficulty)
          }
        >
          <option value="casual">Casual</option>
          <option value="standard">Standard</option>
          <option value="shark">Shark</option>
        </select>
        <label className="demo-sound-toggle">
          <input
            type="checkbox"
            checked={soundEnabled}
            onChange={(e) => onSoundToggle(e.target.checked)}
          />
          Sound
        </label>
      </div>
    </div>
  );
}
