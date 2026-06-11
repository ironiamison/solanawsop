"use client";

import { useCallback, useState } from "react";
import {
  PUMP_FUN_URL,
  TOKEN_SYMBOL,
  explorerMintUrl,
} from "@/lib/constants";
import { getSwspMintAddress } from "@/lib/swsop-token";

function shortenCa(ca: string): string {
  if (ca.length <= 12) return ca;
  return `${ca.slice(0, 6)}…${ca.slice(-6)}`;
}

export default function TokenContractAddress({
  variant = "footer",
  className = "",
}: {
  variant?: "footer" | "hero" | "banner" | "compact";
  className?: string;
}) {
  const ca = getSwspMintAddress();
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (!ca) return;
    try {
      await navigator.clipboard.writeText(ca);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }, [ca]);

  if (!ca) return null;

  const shell =
    variant === "hero"
      ? "token-ca token-ca--hero"
      : variant === "banner"
        ? "token-ca token-ca--banner"
        : variant === "compact"
          ? "token-ca token-ca--compact"
          : "token-ca token-ca--footer";

  return (
    <div className={`${shell} ${className}`.trim()}>
      <span className="token-ca-label">{TOKEN_SYMBOL} CA</span>
      <button
        type="button"
        onClick={copy}
        className="token-ca-value"
        title={ca}
        aria-label={`Copy ${TOKEN_SYMBOL} contract address`}
      >
        <span className="token-ca-full hidden sm:inline">{ca}</span>
        <span className="token-ca-short sm:hidden">{shortenCa(ca)}</span>
        <span className="token-ca-copy">{copied ? "Copied" : "Copy"}</span>
      </button>
      <span className="token-ca-links">
        <a
          href={PUMP_FUN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="token-ca-link"
        >
          pump.fun
        </a>
        <a
          href={explorerMintUrl(ca)}
          target="_blank"
          rel="noopener noreferrer"
          className="token-ca-link"
        >
          Solscan
        </a>
      </span>
    </div>
  );
}
