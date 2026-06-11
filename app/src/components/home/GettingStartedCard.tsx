"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { LobbyCard } from "./lobby";
import BrandChipMark from "@/components/brand/BrandChipMark";

const STORAGE_KEY = "solanawsop_getting_started_dismissed";

const STEPS = [
  {
    n: 1,
    title: "Try the free table",
    copy: "No wallet — jump in at /demo with a username.",
    href: "/demo",
    cta: "Play demo",
  },
  {
    n: 2,
    title: "Connect wallet",
    copy: "Link Privy to play public cash games on-chain.",
    href: null,
    cta: "Connect below",
  },
  {
    n: 3,
    title: "Earn reward points",
    copy: "Hands, referrals, and X verify stack points.",
    href: "/profile?tab=rewards",
    cta: "Rewards",
  },
  {
    n: 4,
    title: "Find friends",
    copy: "Search by @handle and climb the leaderboard.",
    href: "/profile?tab=friends",
    cta: "Add friends",
  },
];

export default function GettingStartedCard() {
  const { authenticated, ready, login } = usePrivy();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!ready || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  return (
    <LobbyCard className="getting-started-card mb-5 overflow-hidden p-0" hover={false}>
      <div className="getting-started-head">
        <BrandChipMark variant="compact" size="sm" showTagline={false} />
        <button type="button" onClick={dismiss} className="getting-started-dismiss">
          Dismiss
        </button>
      </div>
      <div className="getting-started-body">
        <p className="getting-started-label">Getting started</p>
        <p className="getting-started-title">Four steps to your first hand</p>
        <ol className="getting-started-steps">
          {STEPS.map((step) => (
            <li key={step.n} className="getting-started-step">
              <span className="getting-started-step-num">{step.n}</span>
              <div className="min-w-0 flex-1">
                <p className="getting-started-step-title">{step.title}</p>
                <p className="getting-started-step-copy">{step.copy}</p>
              </div>
              {step.href ? (
                <Link href={step.href} className="getting-started-step-cta">
                  {step.cta}
                </Link>
              ) : !authenticated ? (
                <button type="button" onClick={login} className="getting-started-step-cta">
                  {step.cta}
                </button>
              ) : (
                <span className="getting-started-step-done">✓</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </LobbyCard>
  );
}
