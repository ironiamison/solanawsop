const CHIP_COLORS = [
  ["#f4f4f5", "#d4d4d8"],
  ["#ef4444", "#b91c1c"],
  ["#3b82f6", "#1d4ed8"],
  ["#22c55e", "#15803d"],
  ["#a855f7", "#7e22ce"],
];

export default function ChipStack({ tierIndex }: { tierIndex: number }) {
  const [light, dark] = CHIP_COLORS[tierIndex % CHIP_COLORS.length];
  const count = 3 + tierIndex;

  return (
    <div className="relative h-10 w-10 shrink-0">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="absolute left-1/2 h-3 w-8 -translate-x-1/2 rounded-full border border-black/20 shadow-sm"
          style={{
            bottom: i * 3,
            background: `linear-gradient(180deg, ${light}, ${dark})`,
            zIndex: i,
          }}
        />
      ))}
    </div>
  );
}
