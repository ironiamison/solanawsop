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
        className="ui-card flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]"
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
