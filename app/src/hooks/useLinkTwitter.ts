"use client";

import { useCallback, useState } from "react";
import { useLinkAccount, usePrivy } from "@privy-io/react-auth";

/** Link X/Twitter to the current Privy user and sync profile to our DB. */
export function useLinkTwitter() {
  const { authenticated, login, getAccessToken } = usePrivy();
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const syncProfile = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;
    await fetch("/api/profile/sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
  }, [getAccessToken]);

  const { linkTwitter } = useLinkAccount({
    onSuccess: async ({ linkMethod }) => {
      setLinking(false);
      if (linkMethod === "twitter") {
        setError(null);
        await syncProfile();
      }
    },
    onError: () => {
      setLinking(false);
      setError("X login failed. Connect your wallet first, then try Verify X again.");
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
