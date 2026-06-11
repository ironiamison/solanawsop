import Link from "next/link";
import DashboardShell from "@/components/layout/DashboardShell";
import { PROGRAM_ID, TOKEN_SYMBOL } from "@/lib/constants";
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
    title: "Audit deal fairness",
    body: "Each start_hand emits vrf_seed and deck_commitment. Recompute shuffle with fairness/shuffle.ts and deck hash with fairness/commit.ts. Hole cards use commitments on Player PDAs; full cards sit in the HandState PDA until showdown.",
  },
  {
    title: "Audit account state",
    body: "Room accounts expose pot, phase, community cards, hand number, vrf seed, and deck commitment. Player accounts expose stack and bets. Compare to the table.",
  },
  {
    title: "Replay actions",
    body: "Each action is a transaction. Use Solscan to confirm fold/call/raise instructions and resulting account diffs.",
  },
];

const LIMITS = [
  "HandState PDA hole data is still public to RPC — commit–reveal hides Player PDAs, not determined adversaries.",
  "Shuffle mixes SlotHashes sysvar entropy — not Switchboard oracle VRF yet.",
  "Demo and profile chip tables use a server engine — not trustless on Solana.",
  "Get a third-party audit before treating this as mainnet casino-grade.",
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
          We separate what is <strong className="text-zinc-200">cryptographically verifiable</strong> on-chain
          from play modes that still rely on our servers. No false &quot;provably fair&quot; claims.
        </p>

        <section className="mt-8 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h2 className="text-sm font-bold text-emerald-200">Verifiable today (cash games)</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-300">
            <li>Real {TOKEN_SYMBOL} escrow in program-controlled vault token accounts</li>
            <li>Open-source payout and hand-ranking logic in the Anchor program</li>
            <li>SlotHashes-derived shuffle + deck commitment per hand</li>
            <li>Commit–reveal hole cards (masked on Player PDAs during the hand)</li>
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

        <section className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <h2 className="text-sm font-bold text-amber-200">Current limits (honest)</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-zinc-400">
            {LIMITS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm font-bold text-white">Roadmap</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Switchboard VRF · encrypted hole cards · immutable program · external audit.
          </p>
        </section>

        <p className="mt-8 text-xs text-zinc-600">
          Full technical write-up: <code className="text-zinc-500">FAIRNESS.md</code> in the
          repository. At the table, use the <strong className="text-zinc-400">Verify on-chain</strong>{" "}
          panel while playing.
        </p>

        <Link href="/" className="mt-6 inline-block text-sm font-semibold text-violet-400 hover:underline">
          ← Back to lobby
        </Link>
      </div>
    </DashboardShell>
  );
}
