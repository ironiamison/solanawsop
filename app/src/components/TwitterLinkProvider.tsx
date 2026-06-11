"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLinkAccount, usePrivy, useUser } from "@privy-io/react-auth";
import { APP_URL } from "@/lib/constants";

function privyLinkErrorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string } | undefined;
  const msg = e?.message ?? "";
  const code = e?.code ?? "";
  const combined = `${code} ${msg}`.toLowerCase();

  if (
    combined.includes("login with twitter not allowed") ||
    combined.includes("not allowed")
  ) {
    return "Link X from your connected wallet — enable Twitter under Privy → Login methods and add Allowed domains for " + APP_URL;
  }
  if (
    combined.includes("origin") ||
    combined.includes("domain") ||
    combined.includes("redirect")
  ) {
    return `X blocked — in Privy dashboard add ${APP_URL} under Allowed domains and enable Twitter.`;
  }
  if (combined.includes("disabled") || combined.includes("not enabled")) {
    return "Twitter/X is not enabled in Privy — turn it on under Login methods.";
  }
  if (combined.includes("cancel") || combined.includes("closed") || combined.includes("denied")) {
    return "X login cancelled.";
  }
  if (msg) return msg;
  return "Could not link X. Connect your wallet first, then try again.";
}

type TwitterLinkContextValue = {
  connectTwitter: () => void;
  linking: boolean;
  error: string | null;
  clearError: () => void;
};

const TwitterLinkContext = createContext<TwitterLinkContextValue | null>(null);

/** Keeps OAuth link flow mounted app-wide so X redirect-back completes. */
export function TwitterLinkProvider({ children }: { children: React.ReactNode }) {
  const { authenticated, ready, login, getAccessToken, user } = usePrivy();
  const { refreshUser } = useUser();
  const [error, setError] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const syncedRef = useRef(false);

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
          "Profile sync failed. Refresh the page if X already shows as linked."
      );
    }
    return data;
  }, [getAccessToken]);

  const { linkTwitter } = useLinkAccount({
    onSuccess: async () => {
      if (syncedRef.current) return;
      syncedRef.current = true;
      setLinking(false);
      try {
        await refreshUser();
        await syncProfile();
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Profile sync failed after linking X.");
      } finally {
        syncedRef.current = false;
      }
    },
    onError: (err) => {
      setLinking(false);
      syncedRef.current = false;
      setError(privyLinkErrorMessage(err));
    },
  });

  const hasTwitter = user?.linkedAccounts?.some(
    (a) => a.type === "twitter_oauth"
  );

  const connectTwitter = useCallback(() => {
    setError(null);

    if (!ready) {
      setError("Still loading — wait a moment and try again.");
      return;
    }

    if (!authenticated) {
      login({ loginMethods: ["wallet", "twitter", "email"] });
      return;
    }

    if (hasTwitter) {
      void syncProfile().catch((e) =>
        setError(e instanceof Error ? e.message : "Profile sync failed.")
      );
      return;
    }

    setLinking(true);
    try {
      linkTwitter();
    } catch (e) {
      setLinking(false);
      setError(privyLinkErrorMessage(e));
    }
  }, [ready, authenticated, login, linkTwitter, hasTwitter, syncProfile]);

  return (
    <TwitterLinkContext.Provider
      value={{
        connectTwitter,
        linking,
        error,
        clearError: () => setError(null),
      }}
    >
      {children}
    </TwitterLinkContext.Provider>
  );
}

export function useLinkTwitter(): TwitterLinkContextValue {
  const ctx = useContext(TwitterLinkContext);
  if (!ctx) {
    throw new Error("useLinkTwitter must be used within TwitterLinkProvider");
  }
  return ctx;
}
