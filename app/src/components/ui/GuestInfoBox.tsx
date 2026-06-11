"use client";

import type { ReactNode } from "react";

export default function GuestInfoBox({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`guest-info-box ${className}`.trim()} role="status">
      {children}
    </div>
  );
}
