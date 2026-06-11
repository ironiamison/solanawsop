import LegalPageShell from "@/components/legal/LegalPageShell";
import { BRAND_NAME } from "@/lib/constants";

export const metadata = {
  title: `Privacy Policy — ${BRAND_NAME}`,
};

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      <p className="legal-lead">
        Last updated: June 2026. This policy describes how {BRAND_NAME} collects and uses data
        when you use our website, game client, and APIs.
      </p>

      <section>
        <h2>1. What we collect</h2>
        <ul>
          <li>
            <strong>Wallet address</strong> — when you connect via Privy or a Solana wallet
          </li>
          <li>
            <strong>X (Twitter) profile</strong> — handle, display name, and avatar if you link
            or verify
          </li>
          <li>
            <strong>Gameplay stats</strong> — hands played, wins, reward points, leaderboard rank
          </li>
          <li>
            <strong>Social graph</strong> — friends, messages, and table invites stored in our
            database
          </li>
          <li>
            <strong>Referral codes</strong> — to attribute invite rewards
          </li>
        </ul>
      </section>

      <section>
        <h2>2. How we use it</h2>
        <p>
          To operate matchmaking, friends lists, global leaderboards, reward points, chat, and
          flywheel transparency dashboards. On-chain poker state lives on Solana; off-chain social
          and points data lives in our Postgres/SQLite database.
        </p>
      </section>

      <section>
        <h2>3. Sharing</h2>
        <p>
          We do not sell personal data. Public leaderboards may show your X handle, avatar, win
          count, and points. Friends you add can see your profile and message you. Blockchain
          transactions are public by design.
        </p>
      </section>

      <section>
        <h2>4. Third parties</h2>
        <p>
          Authentication (Privy), Solana RPC providers, and X OAuth are subject to their own
          policies. We minimize data sent to each provider.
        </p>
      </section>

      <section>
        <h2>5. Retention &amp; deletion</h2>
        <p>
          Account and social data persist while your account is active. Contact support to
          request deletion of off-chain profile data. On-chain history cannot be erased.
        </p>
      </section>

      <section>
        <h2>6. Contact</h2>
        <p>Privacy requests: privacy@solanawsop.com</p>
      </section>
    </LegalPageShell>
  );
}
