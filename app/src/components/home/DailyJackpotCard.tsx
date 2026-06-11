"use client";

import { useEffect, useState } from "react";
import { TOKEN_SYMBOL } from "@/lib/constants";
import { BtnBlockLink } from "./lobby";
import { JackpotChipStack } from "./HeroAssets";

function msUntilMidnightUtc(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setUTCHours(24, 0, 0, 0);
  return midnight.getTime() - now.getTime();
}

function formatHms(ms: number): [string, string, string] {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [
    String(h).padStart(2, "0"),
    String(m).padStart(2, "0"),
    String(sec).padStart(2, "0"),
  ];
}

export default function DailyJackpotCard({ playHref }: { playHref: string }) {
  const [hms, setHms] = useState<[string, string, string] | null>(null);

  useEffect(() => {
    const tick = () => setHms(formatHms(msUntilMidnightUtc()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const [h, m, s] = hms ?? ["--", "--", "--"];

  return (
    <section className="lobby-jackpot premium-jackpot ui-card ui-card--raised relative flex min-h-[196px] flex-col justify-between overflow-hidden p-5">
      <div className="lobby-jackpot-glow pointer-events-none absolute inset-0" aria-hidden />
      <JackpotChipStack />
      <div className="relative z-10 max-w-[65%]">
        <p className="text-xs font-medium text-violet-400">
          Daily jackpot
        </p>
        <p className="mt-2 text-[2rem] font-black leading-none tabular-nums tracking-tight">
          2,450
        </p>
        <p className="text-sm font-semibold text-violet-300">{TOKEN_SYMBOL}</p>
        <p className="mt-4 text-[10px] font-medium uppercase tracking-wider text-zinc-600">
          Must be won in
        </p>
        <div className="mt-1 flex items-baseline gap-1 font-mono text-xl tabular-nums text-zinc-200">
          <span>{h}</span>
          <span className="text-zinc-600">:</span>
          <span>{m}</span>
          <span className="text-zinc-600">:</span>
          <span>{s}</span>
        </div>
      </div>
      <BtnBlockLink href={playHref} className="relative z-10 mt-4">
        Play to win
      </BtnBlockLink>
    </section>
  );
}
