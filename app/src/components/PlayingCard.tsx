import { cardIsRed, cardRank, cardSuit } from "@/lib/cards";

export default function PlayingCard({
  card,
  hidden = false,
  small = false,
  hero = false,
  fan = "none",
}: {
  card: number;
  hidden?: boolean;
  small?: boolean;
  hero?: boolean;
  fan?: "none" | "left" | "right";
}) {
  const size = hero
    ? "premium-card-hero"
    : small
      ? "premium-card-sm"
      : "premium-card-md";

  const fanClass =
    fan === "left" ? "premium-card-fan-left" : fan === "right" ? "premium-card-fan-right" : "";

  if (hidden) {
    return (
      <div className={`premium-card-back ${size} ${fanClass}`}>
        <div className="premium-card-back-pattern" />
        <div className="premium-card-back-shine" />
      </div>
    );
  }

  const red = cardIsRed(card);
  const suit = cardSuit(card);
  const rank = cardRank(card);

  return (
    <div className={`premium-card-face ${size} ${fanClass} ${red ? "premium-card-red" : "premium-card-black"}`}>
      <div className="premium-card-face-shine" />
      <span className="premium-card-corner premium-card-corner-tl">
        <span className="premium-card-rank">{rank}</span>
        <span className="premium-card-suit">{suit}</span>
      </span>
      <span className="premium-card-center">{suit}</span>
      <span className="premium-card-corner premium-card-corner-br">
        <span className="premium-card-rank">{rank}</span>
        <span className="premium-card-suit">{suit}</span>
      </span>
    </div>
  );
}
