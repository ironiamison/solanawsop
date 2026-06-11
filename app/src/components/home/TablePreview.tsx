"use client";

import LobbyAssetImage from "./LobbyAssetImage";

const SEATS = [
  { left: "50%", top: "78%", color: "#8b5cf6" },
  { left: "22%", top: "62%", color: "#ec4899" },
  { left: "12%", top: "42%", color: "#3b82f6" },
  { left: "32%", top: "22%", color: "#22c55e" },
  { left: "68%", top: "22%", color: "#f59e0b" },
  { left: "88%", top: "42%", color: "#06b6d4" },
];

export default function TablePreview({ playerCount }: { playerCount: number }) {
  return (
    <div className="relative mx-auto aspect-[16/9] w-full max-w-[220px]">
      <LobbyAssetImage
        src="/assets/lobby/poker-table-topdown-3d.png"
        alt=""
        fill
        className="object-contain drop-shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
        sizes="220px"
      />
      {SEATS.map((seat, i) => {
        const filled = i < playerCount;
        return (
          <div
            key={i}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: seat.left, top: seat.top }}
          >
            <div
              className={`h-5 w-5 rounded-full border-2 shadow-md ${
                filled
                  ? "border-white/40 shadow-violet-500/30"
                  : "border-dashed border-white/20 bg-black/40 opacity-60"
              }`}
              style={
                filled
                  ? { background: `linear-gradient(135deg, ${seat.color}, #1a1a22)` }
                  : undefined
              }
            />
          </div>
        );
      })}
    </div>
  );
}
