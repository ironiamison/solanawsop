import Link from "next/link";
import TokenContractAddress from "@/components/token/TokenContractAddress";
import { TOKEN_SYMBOL } from "@/lib/constants";

export default function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] py-8">
      <div className="mx-auto max-w-6xl px-5 text-center sm:px-6">
        <p className="text-xs leading-relaxed text-zinc-600">
          {TOKEN_SYMBOL} wagers on-chain · OTC from creator rewards · burns on buyback
        </p>
        <TokenContractAddress variant="footer" />
        <p className="mt-3 flex flex-wrap items-center justify-center gap-4 text-[11px] text-zinc-600">
          <Link href="/terms" className="transition hover:text-zinc-400">
            Terms
          </Link>
          <Link href="/privacy" className="transition hover:text-zinc-400">
            Privacy
          </Link>
          <Link href="/leaderboard" className="transition hover:text-zinc-400">
            Leaderboard
          </Link>
        </p>
      </div>
    </footer>
  );
}
