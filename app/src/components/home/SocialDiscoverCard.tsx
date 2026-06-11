"use client";

import Link from "next/link";
import { LobbyCard } from "./lobby";

export default function SocialDiscoverCard() {
  return (
    <LobbyCard className="social-discover-card p-5" hover={false}>
      <p className="premium-label">Play together</p>
      <p className="mt-1 text-sm font-semibold text-zinc-200">
        Find friends &amp; climb the ranks
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-zinc-500">
        Search players by X handle, send table invites when private SOL rooms launch, and
        compare wins globally.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/profile?tab=friends" className="social-discover-btn social-discover-btn-primary">
          Find by @handle
        </Link>
        <Link href="/leaderboard" className="social-discover-btn">
          Leaderboard
        </Link>
        <Link href="/profile?tab=invites" className="social-discover-btn">
          Invites
        </Link>
      </div>
    </LobbyCard>
  );
}
