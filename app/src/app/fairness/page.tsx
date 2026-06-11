import Link from "next/link";
import DashboardShell from "@/components/layout/DashboardShell";
import { PROGRAM_ID, TOKEN_SYMBOL, TWITTER_HANDLE, TWITTER_URL } from "@/lib/constants";
import { explorerProgramUrl } from "@/lib/fairness/explorer";

const VERIFY_STEPS = [
  {
    title: "Confirm the program",
    body: `Every join, bet, and leave must call program ${PROGRAM_ID.toBase58().slice(0, 8)}… — verify in your wallet before signing.`,
  },
  {
    title: "Check SPL escrow",
    body: `On join, ${TOKEN_SYMBOL} moves to the room vault token account (PDA). On leave, your stack returns to your wallet ATA. Amounts must match the UI.`,
  },
  {
    title: "Verify the deal",
    body: "Each start_hand publishes a VRF seed and deck commitment on-chain. Recompute the shuffle and commitments with our open-source fairness tools in the repo.",
  },
  {
    title: "Audit account state",
    body: "Room accounts expose pot, phase, community cards, hand number, VRF seed, and deck commitment. Player accounts expose stack and bets. Compare to the table.",
  },
  {
    title: "Replay actions",
    body: "Each action is a transaction. Use Solscan to confirm fold/call/raise instructions and resulting account diffs.",
  },
];

const SCOPE = [
  {
    label: "Cash games",
    body: "On-chain VRF shuffle, deck commitments, and commit–reveal hole cards. SPL escrow and payouts are enforced by the Anchor program.",
  },
  {
    label: "Demo & chip tables",
    body: "Free-play modes use our server engine for speed and zero cost. They are not trustless on Solana.",
  },
];

const ROADMAP = [
  "Switchboard oracle VRF",
  "Enhanced hole-card privacy",
  "Immutable program deployment",
  "Published third-party audit",
];

export default function FairnessPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-violet-400">
          Trust & verification
        </p>
        <h1 className="mt-2 text-2xl font-bold text-white">Fair play on SolanaWSOP</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Cash games run on an open Anchor program with{" "}
          <strong className="text-zinc-200">on-chain VRF dealing</strong>, verifiable
          escrow, and public account state. We publish how it works — no marketing fluff.
        </p>

        <section className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h2 className="text-sm font-bold text-emerald-200">Live on cash tables</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-300">
            <li>Real {TOKEN_SYMBOL} escrow in program-controlled vault token accounts</li>
            <li>On-chain VRF shuffle (SlotHashes) with per-hand deck commitment</li>
            <li>Commit–reveal hole cards — masked on Player PDAs during the hand</li>
            <li>Open-source payout and hand-ranking logic</li>
            <li>Every seat, action, and cash-out as an on-chain transaction</li>
          </ul>
          <a
            href={explorerProgramUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-semibold text-violet-400 hover:underline"
          >
            View program on Solscan →
          </a>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-bold text-white">How to verify a hand</h2>
          <ol className="mt-4 space-y-4">
            {VERIFY_STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-300">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-zinc-200">{step.title}</p>
                  <p className="mt-1 text-zinc-400">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm font-bold text-white">Scope</h2>
          <ul className="mt-3 space-y-3">
            {SCOPE.map((item) => (
              <li key={item.label} className="text-sm">
                <span className="font-semibold text-zinc-200">{item.label}</span>
                <span className="text-zinc-400"> — {item.body}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-6 rounded-xl border border-violet-500/25 bg-violet-500/5 p-5">
          <h2 className="text-sm font-bold text-violet-200">Security audit</h2>
          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
            VRF and commit–reveal dealing are live in the program. We are{" "}
            <strong className="text-zinc-100">waiting for an independent security audit</strong>{" "}
            before calling this mainnet casino-grade.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Auditors, researchers, and white-hats who want to review our contracts or help
            with the audit — reach out on X.
          </p>
          <a
            href={TWITTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-violet-400/40 hover:bg-violet-500/10"
          >
            @{TWITTER_HANDLE} on X →
          </a>
        </section>

        <section className="mt-6 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm font-bold text-white">Roadmap</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {ROADMAP.map((item) => (
              <li
                key={item}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-zinc-400"
              >
                {item}
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-8 text-xs text-zinc-600">
          Full technical write-up: <code className="text-zinc-500">FAIRNESS.md</code> in the
          repository. At the table, use the{" "}
          <strong className="text-zinc-400">Verify on-chain</strong> panel while playing.
          Updates and audit news:{" "}
          <a
            href={TWITTER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-400 hover:underline"
          >
            @{TWITTER_HANDLE}
          </a>
          .
        </p>

        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-violet-400 hover:underline">
          ← Back to lobby
        </Link>
      </div>
    </DashboardShell>
  );
}
