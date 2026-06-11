"use client";

interface Props {
  secondsLeft: number;
  progress: number;
  urgent?: boolean;
  label?: string;
}

export default function MoveTimerBar({
  secondsLeft,
  progress,
  urgent = false,
  label = "Your move",
}: Props) {
  return (
    <div className="opoker-move-timer mb-3 w-full">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
          {label}
        </span>
        <span
          className={`text-base font-bold tabular-nums ${
            urgent ? "text-red-400 premium-timer-urgent" : "text-cyan-300"
          }`}
        >
          {secondsLeft}s
        </span>
      </div>
      <div className="opoker-move-timer-track">
        <div
          className={`opoker-move-timer-fill${urgent ? " opoker-move-timer-fill-urgent" : ""}`}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
    </div>
  );
}
