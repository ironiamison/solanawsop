import Link from "next/link";
import type { ReactNode, ButtonHTMLAttributes } from "react";

export function LobbyCard({
  children,
  className = "",
  id,
  hover = true,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  hover?: boolean;
}) {
  return (
    <section
      id={id}
      className={`rounded-2xl border border-white/[0.08] bg-[#0c0c10] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.04)] ${
        hover
          ? "transition duration-200 hover:border-violet-500/25 hover:shadow-[0_12px_40px_rgba(124,58,237,0.08)]"
          : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3.5 flex items-center justify-between gap-3">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-500">
        {children}
      </h2>
      {action}
    </div>
  );
}

const btnBase =
  "inline-flex items-center justify-center font-bold uppercase tracking-wider transition duration-150";

export function BtnPrimary({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${btnBase} rounded-xl bg-gradient-to-b from-violet-500 to-violet-700 px-6 py-3 text-xs text-white shadow-[0_4px_20px_rgba(124,58,237,0.4)] hover:brightness-110 ${className}`}
    >
      {children}
    </Link>
  );
}

export function BtnGhost({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${btnBase} rounded-xl border border-violet-500/40 px-5 py-3 text-xs font-semibold normal-case tracking-normal text-violet-200 hover:border-violet-400/60 hover:bg-violet-500/10 ${className}`}
    >
      {children}
    </Link>
  );
}

/** Full-width CTA — use on Link wrappers, not bare spans inside Links */
export function BtnBlockLink({
  href,
  children,
  className = "",
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`${btnBase} w-full rounded-xl bg-gradient-to-b from-violet-500 to-violet-700 py-3 text-[11px] text-white shadow-[0_4px_16px_rgba(124,58,237,0.35)] hover:brightness-110 ${className}`}
    >
      {children}
    </Link>
  );
}

/** Decorative label inside a parent Link — not interactive itself */
export function BtnBlockLabel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`${btnBase} pointer-events-none w-full rounded-xl bg-gradient-to-b from-violet-500 to-violet-700 py-3 text-[11px] text-white shadow-[0_4px_16px_rgba(124,58,237,0.35)] ${className}`}
    >
      {children}
    </span>
  );
}

export function BtnSecondary({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={`${btnBase} rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-[11px] font-semibold text-zinc-300 hover:border-white/20 hover:bg-white/[0.07] disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

export function LiveDot({ className = "" }: { className?: string }) {
  return (
    <span className={`relative flex h-2 w-2 ${className}`}>
      <span className="lobby-live-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
    </span>
  );
}

export function TextLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[11px] font-semibold text-violet-400 transition hover:text-violet-300"
    >
      {children}
    </Link>
  );
}
