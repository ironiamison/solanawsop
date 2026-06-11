import Link from "next/link";
import LegalPageShell from "@/components/legal/LegalPageShell";
import { BRAND_NAME } from "@/lib/constants";

export const metadata = {
  title: `Docs — ${BRAND_NAME}`,
};

const DOCS = [
  {
    href: "/terms",
    title: "Terms of Service",
    description:
      "Rules for using the platform, tokenomics flywheel, reward points, and acceptable play.",
  },
  {
    href: "/privacy",
    title: "Privacy Policy",
    description:
      "What we collect (wallet, profile, gameplay), how we use it, and your data rights.",
  },
] as const;

export default function DocsPage() {
  return (
    <LegalPageShell title="Docs">
      <p className="legal-lead">
        Legal and policy documents for {BRAND_NAME}. By playing you agree to our terms and
        acknowledge our privacy practices.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {DOCS.map((doc) => (
          <Link
            key={doc.href}
            href={doc.href}
            className="group rounded-xl border border-white/[0.08] bg-white/[0.03] p-5 transition hover:border-violet-500/30 hover:bg-white/[0.05]"
          >
            <h2 className="text-base font-semibold text-white group-hover:text-violet-300">
              {doc.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">{doc.description}</p>
            <span className="mt-4 inline-block text-xs font-semibold text-violet-400">
              Read →
            </span>
          </Link>
        ))}
      </div>
    </LegalPageShell>
  );
}
