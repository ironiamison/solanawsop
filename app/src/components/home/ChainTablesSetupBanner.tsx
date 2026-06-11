"use client";

import Link from "next/link";
import { useState } from "react";
import TokenContractAddress from "@/components/token/TokenContractAddress";
import { PUMP_FUN_URL, SHOW_DEV_CONTROLS, TOKEN_SYMBOL } from "@/lib/constants";
import { getSwspMint } from "@/lib/swsop-token";

export default function ChainTablesSetupBanner({
  onSetup,
  status,
  onStatusChange,
}: {
  onSetup: () => Promise<void>;
  status: string | null;
  onStatusChange: (msg: string | null) => void;
}) {
  const [deploying, setDeploying] = useState(false);
  const mintReady = Boolean(getSwspMint());

  const handleClick = async () => {
    if (!mintReady || deploying) return;
    setDeploying(true);
    onStatusChange("Deploying on-chain tables…");
    try {
      await onSetup();
    } finally {
      setDeploying(false);
    }
  };

  return (
    <section className="chain-setup-banner" aria-labelledby="chain-setup-title">
      <div className="chain-setup-banner-glow" aria-hidden />
      <div className="chain-setup-banner-inner">
        <div className="chain-setup-banner-icon" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z"
            />
          </svg>
        </div>

        <div className="chain-setup-banner-copy">
          <p className="chain-setup-kicker">
            {mintReady ? "One-time deploy" : "Launch prep"}
          </p>
          <h2 id="chain-setup-title" className="chain-setup-title">
            {mintReady
              ? "Deploy on-chain cash tables"
              : `${TOKEN_SYMBOL} tables aren’t live yet`}
          </h2>
          <p className="chain-setup-desc">
            {mintReady ? (
              <>
                Your connected wallet can create all five stake tiers and escrow vaults on
                Solana. Players will buy in with real {TOKEN_SYMBOL} — you only run this once.
              </>
            ) : (
              <>
                Real-money cash games open after the token launches on pump.fun. Until then,
                the free-play demo table is fully live.
              </>
            )}
          </p>

          <ol className="chain-setup-steps">
            {mintReady ? (
              <>
                <li className="chain-setup-step chain-setup-step--done">
                  <span className="chain-setup-step-dot" />
                  Token mint live on pump.fun
                </li>
                <li className="chain-setup-step">
                  <span className="chain-setup-step-dot" />
                  Approve setup with your deployer wallet
                </li>
                <li className="chain-setup-step">
                  <span className="chain-setup-step-dot" />
                  Five stake tiers go live in the lobby
                </li>
              </>
            ) : (
              <>
                <li className="chain-setup-step">
                  <span className="chain-setup-step-dot" />
                  Launch {TOKEN_SYMBOL} on{" "}
                  <a
                    href={PUMP_FUN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chain-setup-link"
                  >
                    pump.fun
                  </a>
                </li>
                <li className="chain-setup-step">
                  <span className="chain-setup-step-dot" />
                  Add the mint address to production env
                </li>
                <li className="chain-setup-step">
                  <span className="chain-setup-step-dot" />
                  Deploy tables from this screen
                </li>
              </>
            )}
          </ol>

          {mintReady && <TokenContractAddress variant="banner" />}

          {SHOW_DEV_CONTROLS && !mintReady && (
            <p className="chain-setup-dev-hint">
              Dev: set <code>NEXT_PUBLIC_SWSOP_MINT</code> and redeploy.
            </p>
          )}

          {status && (
            <p
              className={`chain-setup-status${
                /fail|error|not set/i.test(status) ? " chain-setup-status--error" : ""
              }`}
              role="status"
            >
              {status}
            </p>
          )}
        </div>

        <div className="chain-setup-banner-actions">
          {mintReady ? (
            <button
              type="button"
              onClick={handleClick}
              disabled={deploying}
              className="ui-btn ui-btn--primary chain-setup-cta"
            >
              {deploying ? "Deploying…" : "Deploy cash tables"}
            </button>
          ) : (
            <span className="chain-setup-waiting-pill">Waiting for token launch</span>
          )}
          <Link href="/demo" className="chain-setup-secondary-link">
            Play free demo →
          </Link>
        </div>
      </div>
    </section>
  );
}
