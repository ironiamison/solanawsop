"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useLinkWithOAuth, usePrivy, useUser } from "@privy-io/react-auth";
function privyLinkErrorMessage(err: unknown): string {
  const e = err as { code?: string; message?: string } | undefined;
  const msg = e?.message ?? "";
  const code = e?.code ?? "";
  const combined = `${code} ${msg}`.toLowerCase();

  if (
    combined.includes("origin") ||
    combined.includes("domain") ||
    combined.includes("redirect")
  ) {
    return "X blocked — in Privy dashboard add https://solanawsop.com under Allowed domains and enable Twitter.";
  }
  if (combined.includes("disabled") || combined.includes("not enabled")) {
    return "Twitter/X is not enabled in Privy — turn it on under Login methods.";
  }
  if (combined.includes("cancel") || combined.includes("closed") || combined.includes("denied")) {
    return "X login cancelled.";
  }
  if (msg) return msg;
  return "Could not open X. Connect your wallet first, then try again.";
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
  const { authenticated, ready, login, getAccessToken } = usePrivy();
  const { refreshUser } = useUser();
  const { initOAuth, state, loading } = useLinkWithOAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
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

  useEffect(() => {
    if (state.status === "loading") {
      setPending(true);
      return;
    }

    if (state.status === "done" && !syncedRef.current) {
      syncedRef.current = true;
      setPending(false);
      void (async () => {
        try {
          await refreshUser();
          await syncProfile();
          setError(null);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Profile sync failed after linking X.");
        } finally {
          syncedRef.current = false;
        }
      })();
      return;
    }

    if (state.status === "error") {
      setPending(false);
      syncedRef.current = false;
      setError(privyLinkErrorMessage(state.error));
    }
  }, [state, refreshUser, syncProfile]);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => {
      setPending(false);
      setError(
        "X didn't open — allow pop-ups/redirects for this site, or enable Twitter in your Privy dashboard."
      );
    }, 12_000);
    return () => clearTimeout(timer);
  }, [pending]);

  const connectTwitter = useCallback(() => {
    void (async () => {
      setError(null);

      if (!ready) {
        setError("Still loading — wait a moment and try again.");
        return;
      }

      if (!authenticated) {
        login({ loginMethods: ["wallet", "twitter", "email"] });
        return;
      }

      setPending(true);
      try {
        await initOAuth({ provider: "twitter" });
      } catch (e) {
        setPending(false);
        setError(privyLinkErrorMessage(e));
      }
    })();
  }, [ready, authenticated, login, initOAuth]);

  const linking = pending || loading || state.status === "loading";

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
