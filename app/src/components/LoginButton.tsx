"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useWallets } from "@privy-io/react-auth/solana";

export default function LoginButton({
  variant = "default",
}: {
  variant?: "default" | "dashboard";
}) {
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();

  if (!ready) {
    return (
      <button disabled className="btn-ghost opacity-50">
        …
      </button>
    );
  }

  if (!authenticated) {
    return (
      <button
        onClick={login}
        className={
          variant === "dashboard"
            ? "rounded-xl bg-gradient-to-b from-[#fde047] to-[#eab308] px-5 py-2.5 text-xs font-bold text-zinc-900 shadow-[0_4px_14px_rgba(234,179,8,0.35)] transition hover:brightness-105"
            : "btn-gold !px-4 !py-2 text-[13px]"
        }
      >
        Connect
      </button>
    );
  }

  const wallet = wallets[0]?.address;
  const twitter = user?.linkedAccounts?.find((a) => a.type === "twitter_oauth");
  const label =
    twitter && "username" in twitter
      ? `@${twitter.username}`
      : wallet
        ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}`
        : "Connected";

  if (variant === "dashboard") {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[100px] truncate text-xs text-zinc-500 sm:inline">
        {label}
      </span>
      <button
        onClick={logout}
        className="rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-400 transition hover:border-white/20 hover:text-zinc-200"
      >
        Out
      </button>
    </div>
  );
}
