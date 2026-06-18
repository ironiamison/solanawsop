"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";

function WalletIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v1.25H6.75A2.75 2.75 0 0 0 4 11.5v5A2.5 2.5 0 0 0 6.5 19h11a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 17.5 7H6.5"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 13.25h.01"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function LoginButton({
  variant = "default",
}: {
  variant?: "default" | "dashboard" | "hero";
}) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();

  const sizeClass =
    variant === "hero"
      ? "wallet-connect-btn--hero"
      : variant === "dashboard"
        ? "wallet-connect-btn--compact"
        : "wallet-connect-btn--md";

  const label =
    variant === "hero" ? "Connect wallet" : variant === "dashboard" ? "Connect" : "Connect wallet";

  if (!ready) {
    return (
      <span
        className={`wallet-connect-btn wallet-connect-btn--loading ${sizeClass}`}
        aria-hidden
      />
    );
  }

  if (!authenticated) {
    return (
      <button
        type="button"
        onClick={login}
        className={`wallet-connect-btn ${sizeClass}`}
      >
        <span className="wallet-connect-btn-icon">
          <WalletIcon />
        </span>
        <span>{label}</span>
      </button>
    );
  }

  const wallet = wallets[0]?.address;
  const twitter = user?.linkedAccounts?.find((a) => a.type === "twitter_oauth");
  const connectedLabel =
    twitter && "username" in twitter
      ? `@${twitter.username}`
      : wallet
        ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}`
        : "Connected";

  if (variant === "dashboard") {
    return (
      <div className="wallet-connected wallet-connected--dashboard">
        <span className="wallet-connected-dot" aria-hidden />
        <span className="wallet-connected-label">{connectedLabel}</span>
        <button type="button" onClick={logout} className="wallet-disconnect-btn">
          Log out
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-connected">
      <span className="wallet-connected-dot" aria-hidden />
      <span className="wallet-connected-label">{connectedLabel}</span>
      <button type="button" onClick={logout} className="wallet-disconnect-btn">
        Log out
      </button>
    </div>
  );
}
