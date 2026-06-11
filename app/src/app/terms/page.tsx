import Link from "next/link";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { BRAND_NAME, PUMP_FUN_URL, TOKEN_SYMBOL } from "@/lib/constants";

export const metadata = {
  title: `Terms of Service — ${BRAND_NAME}`,
};

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service">
      <p className="legal-lead">
        Last updated: June 2026. By using {BRAND_NAME}, you agree to these terms. This is a
        skill-based poker platform on Solana — not financial advice.
      </p>

      <section>
        <h2>1. The service</h2>
        <p>
          {BRAND_NAME} provides on-chain Texas Hold&apos;em cash games, free-play demo tables,
          tournaments, social features (friends, messages, leaderboards), and a reward-points
          program. Real-money play uses {TOKEN_SYMBOL} on Solana. You must comply with local laws
          in your jurisdiction.
        </p>
      </section>

      <section>
        <h2>2. Tokenomics flywheel</h2>
        <p>
          {TOKEN_SYMBOL} is designed as a transparent, community-aligned flywheel — not a
          closed-loop house rake model:
        </p>
        <ul>
          <li>
            <strong>Creator rewards</strong> — Pump.fun creator fees accrue to the project
            treasury and fund OTC buybacks and operations without open-market dumps.
          </li>
          <li>
            <strong>OTC redemptions</strong> — Players may request OTC quotes paid from creator
            rewards. Completed redemptions remove tokens from circulation via burn.
          </li>
          <li>
            <strong>On-chain burns</strong> — Buyback and burn transactions are logged publicly.
            Totals appear on the flywheel dashboard and in block explorers.
          </li>
          <li>
            <strong>Table economics</strong> — Cash game buy-ins and payouts settle on-chain via
            the poker program. Platform fees from bounties and featured events route to winners
            and the flywheel per published rules.
          </li>
        </ul>
        <p>
          Token prices are volatile. {TOKEN_SYMBOL} confers no equity, dividend, or guaranteed
          return. See our{" "}
          <Link href="/privacy">Privacy Policy</Link> for how we handle wallet and profile data.
        </p>
      </section>

      <section>
        <h2>3. Reward points (not tokens)</h2>
        <p>
          Reward points are off-chain loyalty credits for play, referrals, and profile
          verification. They have no cash value until a redemption program launches. Point
          balances, leaderboards, and friend lists are global across the platform and tied to
          your connected account.
        </p>
        <ul>
          <li>Points for completed hands while logged in and seated</li>
          <li>Points for successful friend referrals via your invite link</li>
          <li>Points for verifying your X (Twitter) profile</li>
          <li>Point redemption — redeem on Profile → Rewards (queued fulfillment)</li>
          <li>Private SOL tables — coming soon; public games use {TOKEN_SYMBOL}</li>
        </ul>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>
          No collusion, bots, multi-accounting for advantage, or money laundering. We may suspend
          accounts that violate fair play. On-chain actions are irreversible once confirmed.
        </p>
      </section>

      <section>
        <h2>5. Disclaimers</h2>
        <p>
          Software is provided &quot;as is.&quot; {BRAND_NAME} is not responsible for wallet loss,
          smart-contract risk, network congestion, or third-party services (Privy, Solana RPC,
          X/Twitter). You are responsible for securing your keys.
        </p>
      </section>

      <section>
        <h2>6. Contact</h2>
        <p>
          Questions: support@{BRAND_NAME.toLowerCase().replace(/\s/g, "")}.com · Token info:{" "}
          <a href={PUMP_FUN_URL} target="_blank" rel="noopener noreferrer">
            {PUMP_FUN_URL}
          </a>
        </p>
      </section>
    </LegalPageShell>
  );
}
