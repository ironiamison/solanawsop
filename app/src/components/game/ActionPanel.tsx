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
  timerLabel?: string;
  canCheck: boolean;
  callAmount: number;
  pot: number;
  stack: number;
  roundBet: number;
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
  timerLabel,
  canCheck,
  callAmount,
  pot,
  stack,
  roundBet,
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
  const maxRaiseTo = roundBet + stack;
  const minRaiseTo =
    currentBet === 0
      ? Math.min(maxRaiseTo, minRaise)
      : Math.min(maxRaiseTo, currentBet + minRaise);
  const isOpeningBet = currentBet === 0;
  const canBetOrRaise = maxRaiseTo >= minRaiseTo;

  const clampedBet = Math.min(maxRaiseTo, Math.max(minRaiseTo, betAmount));
  const effectiveMinRaise = Math.max(1, minRaise);

  const sliderPct = useMemo(() => {
    if (maxRaiseTo <= minRaiseTo) return 100;
    return ((clampedBet - minRaiseTo) / (maxRaiseTo - minRaiseTo)) * 100;
  }, [clampedBet, minRaiseTo, maxRaiseTo]);

  if (!visible && !showShell) return null;

  const setSliderPct = (pct: number) => {
    const p = Math.min(100, Math.max(0, pct));
    const raw = minRaiseTo + ((maxRaiseTo - minRaiseTo) * p) / 100;
    onBetAmountChange(Math.floor(raw));
  };

  const setPotBet = () => {
    const potRaiseTo = Math.min(maxRaiseTo, currentBet + pot + callAmount);
    onBetAmountChange(Math.max(minRaiseTo, potRaiseTo));
  };

  const step = effectiveMinRaise;
  const displayAmount = Number(clampedBet) / Math.pow(10, TOKEN_DECIMALS);

  const bump = (delta: number) => {
    onBetAmountChange(
      Math.min(maxRaiseTo, Math.max(minRaiseTo, clampedBet + delta))
    );
  };

  const raiseIncrement = clampedBet - currentBet;
  const betReady =
    canBetOrRaise &&
    (clampedBet === maxRaiseTo ||
      (raiseIncrement >= effectiveMinRaise && clampedBet <= maxRaiseTo));

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
          label={timerLabel}
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
        {isOpeningBet ? (
          <button
            type="button"
            onClick={onRaise}
            disabled={pending || !visible || !betReady}
            className={`opoker-action-btn opoker-action-raise ${betReady ? "opoker-action-raise-hot" : ""}`}
          >
            Bet {formatAmount(clampedBet)}
          </button>
        ) : (
          <button
            type="button"
            onClick={onRaise}
            disabled={pending || !visible || !betReady}
            className={`opoker-action-btn opoker-action-raise ${betReady ? "opoker-action-raise-hot" : ""}`}
          >
            Raise to {formatAmount(clampedBet)}
          </button>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 sm:flex-row">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={sliderPct}
          onChange={(e) => setSliderPct(Number(e.target.value))}
          disabled={!visible || !canBetOrRaise}
          className="bet-slider w-full max-w-md flex-1"
          style={{ "--pct": `${sliderPct}%` } as React.CSSProperties}
        />
        <div className="flex flex-wrap justify-center gap-1">
          {[
            { label: "33%", p: 33 },
            { label: "50%", p: 50 },
            { label: "75%", p: 75 },
          ].map(({ label, p }) => (
            <button
              key={label}
              type="button"
              onClick={() => setSliderPct(p)}
              disabled={!visible || !canBetOrRaise}
              className="quick-bet-btn"
            >
              {label}
            </button>
          ))}
          <button
            type="button"
            onClick={setPotBet}
            disabled={!visible || !canBetOrRaise}
            className="quick-bet-btn"
          >
            Pot
          </button>
          <button
            type="button"
            onClick={() => onBetAmountChange(maxRaiseTo)}
            disabled={!visible || !canBetOrRaise}
            className="quick-bet-btn"
          >
            All in
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => bump(-step)}
            disabled={!visible || !canBetOrRaise}
            className="opoker-step-btn"
            aria-label="Decrease"
          >
            −
          </button>
          <div className="opoker-bet-input flex items-center gap-1">
            <span className="text-xs">🪙</span>
            <input
              type="number"
              step="any"
              min={minRaiseTo / Math.pow(10, TOKEN_DECIMALS)}
              max={maxRaiseTo / Math.pow(10, TOKEN_DECIMALS)}
              value={Number.isInteger(displayAmount) ? displayAmount : displayAmount.toFixed(1)}
              disabled={!visible || !canBetOrRaise}
              onChange={(e) => {
                const human = parseFloat(e.target.value || "0");
                if (!Number.isFinite(human)) return;
                const raw = Math.round(human * Math.pow(10, TOKEN_DECIMALS));
                onBetAmountChange(
                  Math.min(maxRaiseTo, Math.max(minRaiseTo, raw))
                );
              }}
              className="w-14 bg-transparent text-center text-sm font-bold tabular-nums text-white outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => bump(step)}
            disabled={!visible || !canBetOrRaise}
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
