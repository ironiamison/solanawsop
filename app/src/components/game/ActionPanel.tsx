"use client";

import { useMemo } from "react";
import { formatTokens, TOKEN_DECIMALS } from "@/lib/constants";
import MoveTimerBar from "./MoveTimerBar";

interface Props {
  visible: boolean;
  showShell?: boolean;
  timerSecondsLeft?: number;
  timerProgress?: number;
  timerUrgent?: boolean;
  canCheck: boolean;
  callAmount: number;
  pot: number;
  stack: number;
  minRaise: number;
  currentBet: number;
  betAmount: number;
  onBetAmountChange: (n: number) => void;
  onFold: () => void;
  onCheck: () => void;
  onCall: () => void;
  onRaise: () => void;
  pending: boolean;
  formatAmount?: (n: number) => string;
}

export default function ActionPanel({
  visible,
  showShell = false,
  timerSecondsLeft,
  timerProgress,
  timerUrgent,
  canCheck,
  callAmount,
  pot,
  stack,
  minRaise,
  currentBet,
  betAmount,
  onBetAmountChange,
  onFold,
  onCheck,
  onCall,
  onRaise,
  pending,
  formatAmount = formatTokens,
}: Props) {
  const maxBet = stack + (currentBet > 0 ? callAmount : 0);
  const raiseToMin = currentBet + minRaise;
  const minBet = Math.min(maxBet, Math.max(raiseToMin, callAmount + minRaise));

  const pct = useMemo(() => {
    if (maxBet <= minBet) return 100;
    return ((betAmount - minBet) / (maxBet - minBet)) * 100;
  }, [betAmount, minBet, maxBet]);

  if (!visible && !showShell) return null;

  const setPct = (p: number) => {
    const raw = minBet + ((maxBet - minBet) * p) / 100;
    onBetAmountChange(Math.floor(raw));
  };

  const raiseTotal = betAmount;
  const isRaise = raiseTotal >= raiseToMin;
  const step = minRaise;
  const displayAmount = Math.floor(betAmount / Math.pow(10, TOKEN_DECIMALS));

  const bump = (delta: number) => {
    onBetAmountChange(Math.min(maxBet, Math.max(minBet, betAmount + delta)));
  };

  const showTimer =
    visible && timerSecondsLeft !== undefined && timerProgress !== undefined;

  return (
    <div
      className={`opoker-action-panel relative z-10 w-full max-w-3xl transition-opacity ${
        !visible ? "pointer-events-none opacity-30" : ""
      }`}
    >
      {showTimer && (
        <MoveTimerBar
          secondsLeft={timerSecondsLeft}
          progress={timerProgress}
          urgent={timerUrgent}
        />
      )}
      <div className="mb-2.5 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={onFold}
          disabled={pending || !visible}
          className="opoker-action-btn opoker-action-fold"
        >
          Fold
        </button>
        {canCheck ? (
          <button
            type="button"
            onClick={onCheck}
            disabled={pending || !visible}
            className="opoker-action-btn opoker-action-check"
          >
            Check
          </button>
        ) : (
          <button
            type="button"
            onClick={onCall}
            disabled={pending || !visible}
            className="opoker-action-btn opoker-action-check"
          >
            Call {formatAmount(callAmount)}
          </button>
        )}
        <button
          type="button"
          onClick={onRaise}
          disabled={pending || !visible || betAmount < minBet}
          className="opoker-action-btn opoker-action-bet"
        >
          Bet {formatAmount(raiseTotal)}
        </button>
        <button
          type="button"
          onClick={onRaise}
          disabled={pending || !visible || !isRaise}
          className={`opoker-action-btn opoker-action-raise ${isRaise ? "opoker-action-raise-hot" : ""}`}
        >
          {isRaise ? `Raise to ${formatAmount(raiseTotal)}` : "Raise"}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2 sm:flex-row">
        <input
          type="range"
          min={minBet}
          max={maxBet}
          value={Math.min(betAmount, maxBet)}
          onChange={(e) => onBetAmountChange(Number(e.target.value))}
          disabled={!visible}
          className="bet-slider w-full max-w-md flex-1"
          style={{ "--pct": `${pct}%` } as React.CSSProperties}
        />
        <div className="flex flex-wrap justify-center gap-1">
          {[
            { label: "33%", p: 33 },
            { label: "50%", p: 50 },
            { label: "75%", p: 75 },
            { label: "Pot", p: pot > 0 ? Math.min(100, (pot / maxBet) * 100) : 50 },
            { label: "All in", p: 100 },
          ].map(({ label, p }) => (
            <button
              key={label}
              type="button"
              onClick={() => setPct(p)}
              disabled={!visible}
              className="quick-bet-btn"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => bump(-step)}
            disabled={!visible}
            className="opoker-step-btn"
            aria-label="Decrease"
          >
            −
          </button>
          <div className="opoker-bet-input flex items-center gap-1">
            <span className="text-xs">🪙</span>
            <input
              type="number"
              value={displayAmount}
              disabled={!visible}
              onChange={(e) =>
                onBetAmountChange(
                  Math.floor(parseFloat(e.target.value || "0") * Math.pow(10, TOKEN_DECIMALS))
                )
              }
              className="w-14 bg-transparent text-center text-sm font-bold tabular-nums text-white outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => bump(step)}
            disabled={!visible}
            className="opoker-step-btn"
            aria-label="Increase"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}
