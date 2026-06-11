"use client";

import { useEffect } from "react";
import Image from "next/image";

/** Penthouse room — shared background for every loading / waiting screen */
export default function LoadingPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyTouch = body.style.touchAction;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.touchAction = "none";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.touchAction = prevBodyTouch;
    };
  }, []);

  return (
    <div className="loading-page-shell">
      <Image
        src="/assets/lobby/penthouse-bg.png"
        alt=""
        fill
        priority
        unoptimized
        className="loading-page-shell-bg"
        sizes="100vw"
      />
      <div className="loading-page-shell-overlay" aria-hidden />
      <div className="loading-page-shell-content">{children}</div>
    </div>
  );
}
