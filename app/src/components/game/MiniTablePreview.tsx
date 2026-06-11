"use client";

const SEAT_ANGLES = [90, 150, 210, 270, 330, 30];

export default function MiniTablePreview({
  playerCount,
  maxSeats = 6,
  inHand = false,
}: {
  playerCount: number;
  maxSeats?: number;
  inHand?: boolean;
}) {
  return (
    <div className="relative mx-auto aspect-[2/1] w-full max-w-[200px]">
      <div
        className={`mini-felt absolute inset-[8%] rounded-[50%] ${inHand ? "mini-felt-active" : ""}`}
      />
      {SEAT_ANGLES.slice(0, maxSeats).map((deg, i) => {
        const filled = i < playerCount;
        const rad = (deg * Math.PI) / 180;
        const x = 50 + Math.cos(rad) * 42;
        const y = 50 + Math.sin(rad) * 36;
        return (
          <div
            key={deg}
            className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all ${
              filled
                ? "seat-filled border-[#e8c547]/60 bg-[#e8c547] shadow-[0_0_8px_rgba(232,197,71,0.5)]"
                : "border-white/15 bg-white/5"
            }`}
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        );
      })}
      {inHand && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold uppercase tracking-wider text-emerald-300/80">
          Live
        </div>
      )}
    </div>
  );
}
