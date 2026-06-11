"use client";

import { useState } from "react";

export default function CollapsibleSection({
  id,
  title,
  subtitle,
  defaultOpen = false,
  children,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section id={id} className="scroll-mt-24">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 text-left transition hover:bg-white/[0.04]"
      >
        <div>
          <h2 className="text-sm font-semibold text-zinc-300">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-zinc-600">{subtitle}</p>
          )}
        </div>
        <span
          className={`text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      {open && <div className="mt-4">{children}</div>}
    </section>
  );
}
