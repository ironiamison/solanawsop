"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { usePrivy } from "@privy-io/react-auth";

const STORAGE_KEY = "solanawsop_getting_started_dismissed";
const DEMO_KEY = "solanawsop_demo_visited";

type StepId = "demo" | "wallet" | "rewards" | "friends";

const STEPS: {
  id: StepId;
  n: number;
  title: string;
  copy: string;
  href?: string;
  cta: string;
  icon: ReactNode;
}[] = [
  {
    id: "demo",
    n: 1,
    title: "Play free",
    copy: "No wallet. Pick a username and sit at the demo table.",
    href: "/demo",
    cta: "Open demo",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "wallet",
    n: 2,
    title: "Connect",
    copy: "Link your wallet with Privy for on-chain cash games.",
    cta: "Connect wallet",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
      </svg>
    ),
  },
  {
    id: "rewards",
    n: 3,
    title: "Earn points",
    copy: "Hands played, referrals, and X verify stack reward points.",
    href: "/profile?tab=rewards",
    cta: "View rewards",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.25 2.25 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.25 2.25 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
      </svg>
    ),
  },
  {
    id: "friends",
    n: 4,
    title: "Find rivals",
    copy: "Search by @handle, add friends, and climb the board.",
    href: "/friends",
    cta: "Discover players",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
];

function StepTile({
  step,
  done,
  onLogin,
}: {
  step: (typeof STEPS)[number];
  done: boolean;
  onLogin: () => void;
}) {
  const body = (
    <>
      <div className="gs-step-top">
        <span className="gs-step-icon" aria-hidden>
          {step.icon}
        </span>
        <span className={`gs-step-badge ${done ? "gs-step-badge--done" : ""}`}>
          {done ? "✓" : step.n}
        </span>
      </div>
      <h3 className="gs-step-title">{step.title}</h3>
      <p className="gs-step-copy">{step.copy}</p>
      <span className="gs-step-cta">
        {done ? "Done" : step.cta}
        {!done && (
          <svg viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
    </>
  );

  const className = `gs-step ${done ? "gs-step--done" : ""}`;

  if (step.id === "wallet" && !done) {
    return (
      <button type="button" onClick={onLogin} className={className}>
        {body}
      </button>
    );
  }

  if (step.href && !done) {
    return (
      <Link href={step.href} className={className}>
        {body}
      </Link>
    );
  }

  return <div className={className}>{body}</div>;
}

export default function GettingStartedCard() {
  const { authenticated, ready, login } = usePrivy();
  const [dismissed, setDismissed] = useState(true);
  const [demoDone, setDemoDone] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(STORAGE_KEY) === "1");
      setDemoDone(localStorage.getItem(DEMO_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const doneMap = useMemo(
    (): Record<StepId, boolean> => ({
      demo: demoDone,
      wallet: authenticated,
      rewards: authenticated,
      friends: authenticated,
    }),
    [demoDone, authenticated]
  );

  const completed = STEPS.filter((s) => doneMap[s.id]).length;
  const progress = Math.round((completed / STEPS.length) * 100);

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
    <section className="gs-panel mb-5">
      <div className="gs-panel-glow" aria-hidden />
      <div className="gs-panel-inner">
        <header className="gs-header">
          <div className="gs-header-copy">
            <p className="gs-eyebrow">New here?</p>
            <h2 className="gs-heading">Deal yourself in</h2>
            <p className="gs-sub">
              Four quick steps — most players are at the table in under a minute.
            </p>
          </div>
          <div className="gs-progress-wrap">
            <div
              className="gs-progress-ring"
              style={{ "--gs-progress": `${progress}%` } as CSSProperties}
              role="progressbar"
              aria-valuenow={completed}
              aria-valuemin={0}
              aria-valuemax={STEPS.length}
              aria-label={`${completed} of ${STEPS.length} steps complete`}
            >
              <span className="gs-progress-value">
                {completed}
                <span className="gs-progress-of">/{STEPS.length}</span>
              </span>
            </div>
            <button type="button" onClick={dismiss} className="gs-dismiss">
              Hide guide
            </button>
          </div>
        </header>

        <div className="gs-grid">
          {STEPS.map((step) => (
            <StepTile
              key={step.id}
              step={step}
              done={doneMap[step.id]}
              onLogin={login}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
