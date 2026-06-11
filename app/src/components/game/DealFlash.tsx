"use client";

export default function DealFlash({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div className="premium-deal-flash pointer-events-none" aria-hidden>
      <div className="premium-deal-flash-inner">
        <div className="premium-deal-flash-cards">
          <span className="premium-deal-flash-card premium-deal-flash-card-a" />
          <span className="premium-deal-flash-card premium-deal-flash-card-b" />
          <span className="premium-deal-flash-card premium-deal-flash-card-c" />
        </div>
        <p className="premium-deal-flash-label">Dealing</p>
      </div>
    </div>
  );
}
