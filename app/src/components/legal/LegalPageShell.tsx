import Link from "next/link";
import BrandChipMark from "@/components/brand/BrandChipMark";
import { BRAND_NAME } from "@/lib/constants";

export default function LegalPageShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="legal-page min-h-screen">
      <header className="legal-page-header">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5 sm:px-6">
          <BrandChipMark variant="lockup" size="sm" href="/" showTagline={false} />
          <Link href="/" className="text-xs font-semibold text-violet-400 transition hover:text-violet-300">
            ← Back to lobby
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 pb-16 pt-4 sm:px-6">
        <p className="premium-label">{BRAND_NAME}</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">{title}</h1>
        <div className="legal-prose mt-8">{children}</div>
      </main>
    </div>
  );
}
