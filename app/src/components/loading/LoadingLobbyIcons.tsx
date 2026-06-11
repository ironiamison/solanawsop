type IconName =
  | "shield"
  | "lock"
  | "bolt"
  | "trophy"
  | "clock"
  | "users"
  | "table"
  | "bulb"
  | "solana";

const PATHS: Record<IconName, string> = {
  shield:
    "M12 2l8 4v6c0 5.25-3.5 9.74-8 11-4.5-1.26-8-5.75-8-11V6l8-4z M9 12l2 2 4-4",
  lock: "M7 11V8a5 5 0 0110 0v3 M5 11h14v10H5V11z",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7l1-8z",
  trophy:
    "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4z M5 4H3v2a3 3 0 003 3M19 4h2v2a3 3 0 01-3 3",
  clock: "M12 8v5l3 2 M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  users:
    "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M22 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
  table: "M4 10h16M6 14h12M8 18h8 M12 6v12",
  bulb: "M9 18h6M10 22h4M9 14a3 3 0 013-5.2 3 3 0 013 5.2c-.6.5-1 1.2-1 2.1H10c0-.9-.4-1.6-1-2.1z",
  solana:
    "M4 14.5L7 12.5 10 14.5 10 17.5 7 19.5 4 17.5z M7 8.5L10 6.5 13 8.5 13 11.5 10 13.5 7 11.5z M10 14.5L13 12.5 16 14.5 16 17.5 13 19.5 10 17.5z",
};

export function LoadingLobbyIcon({
  name,
  tone = "purple",
  className = "",
}: {
  name: IconName;
  tone?: "purple" | "green" | "amber";
  className?: string;
}) {
  const toneClass =
    tone === "green"
      ? "loading-lobby-icon-green"
      : tone === "amber"
        ? "loading-lobby-icon-amber"
        : "loading-lobby-icon-purple";

  return (
    <span className={`loading-lobby-icon ${toneClass} ${className}`} aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d={PATHS[name]} />
      </svg>
    </span>
  );
}
