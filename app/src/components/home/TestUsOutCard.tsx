"use client";

import Image from "next/image";
import Link from "next/link";
import { TOKEN_SYMBOL } from "@/lib/constants";

export default function TestUsOutCard() {
  return (
    <section className="test-us-out-card">
      <Image
        src="/assets/lobby/test-us-out-bg.png"
        alt=""
        fill
        priority
        unoptimized
        className="test-us-out-card-bg"
        sizes="(max-width: 1320px) 100vw, 1320px"
      />
      <div className="test-us-out-card-vignette" aria-hidden />
      <div className="test-us-out-card-inner">
        <div className="test-us-out-card-copy">
          <p className="test-us-out-kicker">No wallet needed</p>
          <h2 className="test-us-out-title">Test us out</h2>
          <p className="test-us-out-desc">
            Jump into our shared free-play table — pick a username, bet{" "}
            <span className="text-zinc-300">{TOKEN_SYMBOL} play chips</span>, chat and voice with
            others. Full at 6? Spectate until a seat opens.
          </p>
          <ul className="test-us-out-tags">
            <li>Free chips</li>
            <li>Live chat</li>
            <li>Voice</li>
            <li>6-max</li>
          </ul>
        </div>
        <Link href="/demo" className="ui-btn ui-btn--primary test-us-out-cta shrink-0">
          Try free table
        </Link>
      </div>
    </section>
  );
}
