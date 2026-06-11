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
      className={`ui-card ${hover ? "ui-card--hover" : ""} ${className}`.trim()}
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
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="ui-section-label">{children}</h2>
      {action}
    </div>
  );
}

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
    <Link href={href} className={`ui-btn ui-btn--primary ${className}`.trim()}>
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
    <Link href={href} className={`ui-btn ui-btn--ghost ${className}`.trim()}>
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
    <Link href={href} className={`ui-btn ui-btn--primary ui-btn--block ${className}`.trim()}>
      {children}
    </Link>
  );
}

/** Decorative label inside a parent Link — not interactive itself */
export function BtnBlockLabel({
  children,
  className = "",
  muted = false,
}: {
  children: ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <span
      className={`ui-btn ui-btn--block ${muted ? "ui-btn--muted" : "ui-btn--primary"} pointer-events-none ${className}`.trim()}
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
    <button type="button" {...props} className={`ui-btn ui-btn--soft ${className}`.trim()}>
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
    <Link href={href} className="ui-text-link">
      {children}
    </Link>
  );
}
