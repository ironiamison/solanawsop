"use client";

import Image from "next/image";

export default function LeaderboardPageHero() {
  return (
    <section className="lb-hero mb-5">
      <Image
        src="/assets/lobby/leaderboard-hero-bg.png"
        alt=""
        fill
        priority
        unoptimized
        className="lb-hero-bg"
        sizes="(max-width: 1320px) 100vw, 1320px"
      />
      <div className="lb-hero-vignette" aria-hidden />
      <div className="lb-hero-glow" aria-hidden />
      <div className="lb-hero-content">
        <p className="lb-hero-kicker">Season 1 · Global</p>
        <h1 className="lb-hero-title font-display">Leaderboard</h1>
        <p className="lb-hero-desc">
          Rankings by wins and reward points — find rivals and add friends by @handle.
        </p>
      </div>
    </section>
  );
}
