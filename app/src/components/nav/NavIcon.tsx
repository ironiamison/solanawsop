import type { NavIconName } from "@/lib/dashboard-nav";

/** Premium stroke icons — 1.5 weight, 24×24 */
export default function NavIcon({
  name,
  className = "h-[18px] w-[18px]",
}: {
  name: NavIconName;
  className?: string;
}) {
  const stroke = 1.5;

  switch (name) {
    case "home":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9V20.5H5.5A1.5 1.5 0 0 1 4 19v-8.5Z"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinejoin="round"
          />
        </svg>
      );
    case "play":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="8.25" stroke="currentColor" strokeWidth={stroke} />
          <path
            d="M10.2 8.6v6.8L15.8 12 10.2 8.6Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth={0.5}
            strokeLinejoin="round"
          />
        </svg>
      );
    case "trophy":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M8 4h8v2.2c0 2.2 1.4 4.1 3.4 4.8H16a4 4 0 0 1-8 0H4.6C6.6 10.3 8 8.4 8 6.2V4Z"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinejoin="round"
          />
          <path
            d="M9 18.5h6M12 14.8V18.5"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d="M7.5 20.5h9"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </svg>
      );
    case "users":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth={stroke} />
          <path
            d="M4 18.5c0-2.5 2.2-4 5-4s5 1.5 5 4"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d="M16.5 11.2a2.6 2.6 0 1 0 0-4.6"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d="M18.5 18.5c0-1.8-1.5-3.2-3.5-3.5"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </svg>
      );
    case "chat":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 6.5h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3.5V8.5a2 2 0 0 1 2-2Z"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinejoin="round"
          />
          <path d="M8.5 11h7M8.5 13.5h4" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
        </svg>
      );
    case "chart":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M6 18V10M12 18V6M18 18v-4"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path d="M4 19h16" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" />
        </svg>
      );
    case "gift":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M5 10.5h14v8.5H5V10.5Z"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinejoin="round"
          />
          <path d="M12 10.5v8.5M5 14h14" stroke="currentColor" strokeWidth={stroke} />
          <path
            d="M12 10.5c-2 0-3.5-1-3.5-2.4S10 5.5 12 5.5s3.5 1 3.5 2.6S14 10.5 12 10.5Z"
            stroke="currentColor"
            strokeWidth={stroke}
          />
        </svg>
      );
    case "user":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="9" r="3.25" stroke="currentColor" strokeWidth={stroke} />
          <path
            d="M6.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        </svg>
      );
    default:
      return null;
  }
}
