"use client";

import { TOKEN_SYMBOL } from "@/lib/constants";
import { BtnPrimary } from "@/components/home/lobby";

export default function BotPracticePanel() {
  return (
    <div className="private-tables-panel">
      <div className="private-tables-soon-head mb-4">
        <p className="private-tables-soon-title">Test your strategy</p>
        <p className="private-tables-soon-copy">
          Profile-only practice table. Play full hands against bots — auto-deal,
          timers, and {TOKEN_SYMBOL} play chips. No wallet wager required.
        </p>
      </div>
      <ul className="private-tables-steps private-tables-steps--muted mb-4">
        <li>
          <span className="private-tables-step-num">1</span>
          Six-max table with up to five bots filling empty seats.
        </li>
        <li>
          <span className="private-tables-step-num">2</span>
          Sharpen pre-flop and post-flop decisions without pressure.
        </li>
        <li>
          <span className="private-tables-step-num">3</span>
          Only visible here in your profile — not on the public lobby.
        </li>
      </ul>
      <BtnPrimary href="/profile/practice">Play vs bots</BtnPrimary>
    </div>
  );
}
