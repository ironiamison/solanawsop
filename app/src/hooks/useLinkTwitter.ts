"use client";

import { useCallback, useState } from "react";
import { useLinkAccount, usePrivy, useUser } from "@privy-io/react-auth";

function privyLinkErrorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string } | undefined;
  const msg = e?.message ?? "";
  const code = e?.code ?? "";
  const combined = `${code} ${msg}`.toLowerCase();

  if (combined.includes("origin") || combined.includes("domain") || combined.includes("redirect")) {
    return "X login blocked — add https://solanawsop.com in Privy → Configuration → Domains.";
  }
  if (combined.includes("cancel") || combined.includes("closed")) {
    return "X login cancelled.";
  }
  if (msg) return msg;
  return "X login failed. Connect your wallet first, then try Verify X again.";
}

/** Link X/Twitter to the current Privy user and sync profile to our DB. */
export function useLinkTwitter() {
  const { authenticated, login, getAccessToken } = usePrivy();
  const { refreshUser } = useUser();
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncProfile = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) {
      throw new Error("Not signed in — connect your wallet and try again.");
    }
    const res = await fetch("/api/profile/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        (data as { error?: string }).error ??
          "Profile sync failed. Your X may be linked — refresh the page."
      );
    }
    return data;
  }, [getAccessToken]);

  const { linkTwitter } = useLinkAccount({
    onSuccess: async ({ linkMethod }) => {
      setLinking(false);
      if (linkMethod !== "twitter") return;
      try {
        await refreshUser();
        await syncProfile();
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Profile sync failed after linking X.");
      }
    },
    onError: (err) => {
      setLinking(false);
      setError(privyLinkErrorMessage(err));
    },
  });

  const connectTwitter = useCallback(() => {
    setError(null);
    if (!authenticated) {
      login();
      return;
    }
    setLinking(true);
    linkTwitter();
  }, [authenticated, login, linkTwitter]);

  return {
    connectTwitter,
    linking,
    error,
    clearError: () => setError(null),
  };
}
