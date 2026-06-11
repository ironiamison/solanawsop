"use client";

import Link from "next/link";
import LoginButton from "@/components/LoginButton";
import { usePrivyProfile } from "@/hooks/usePrivyProfile";
import { TOKEN_SYMBOL } from "@/lib/constants";

interface Props {
  backHref?: string;
  backLabel?: string;
  title?: string;
}

export default function SiteHeader({ backHref, backLabel, title }: Props) {
  const profile = usePrivyProfile();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#07080c]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          {backHref && (
            <Link
              href={backHref}
              className="shrink-0 text-sm text-zinc-500 transition hover:text-[#e8c547]"
            >
              {backLabel ?? "← Back"}
            </Link>
          )}
          <Link href="/" className="group min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e8c547]/20 bg-[#e8c547]/10 text-lg">
                ♠
              </span>
              <div className="min-w-0">
                <h1 className="truncate font-display text-lg font-normal tracking-wide text-zinc-100 sm:text-xl">
                  {title ?? (
                    <>
                      {TOKEN_SYMBOL}{" "}
                      <span className="text-gold-gradient">Poker</span>
                    </>
                  )}
                </h1>
                {!title && (
                  <p className="hidden text-[11px] tracking-wide text-zinc-500 sm:block">
                    On-chain Hold&apos;em
                  </p>
                )}
              </div>
            </div>
          </Link>
        </div>

        <nav className="flex items-center gap-1.5 sm:gap-2">
          <Link href="/" className="nav-link hidden sm:inline-flex">
            Lobby
          </Link>
          <Link href="/#community" className="nav-link hidden md:inline-flex">
            Ranks
          </Link>
          <Link
            href="/profile"
            className="nav-link max-w-[120px] truncate sm:max-w-none"
          >
            {profile.twitterHandle
              ? `@${profile.twitterHandle}`
              : "Profile"}
          </Link>
          <LoginButton />
        </nav>
      </div>
    </header>
  );
}
