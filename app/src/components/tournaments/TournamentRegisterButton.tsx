"use client";

import { useCallback, useState } from "react";
import LoginButton from "@/components/LoginButton";
import { usePokerProgram } from "@/hooks/usePokerProgram";
import { usePrivyProfile } from "@/hooks/usePrivyProfile";

export default function TournamentRegisterButton({
  tournamentId,
  className = "",
  label = "Register free",
}: {
  tournamentId: string;
  className?: string;
  label?: string;
}) {
  const { authenticated, publicKey } = usePokerProgram();
  const profile = usePrivyProfile();
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = useCallback(async () => {
    if (!authenticated) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: publicKey?.toBase58(),
          username:
            profile.twitterHandle ??
            profile.displayName ??
            publicKey?.toBase58().slice(0, 8),
          privyUserId: profile.privyUserId,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Could not register");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error — try again");
    } finally {
      setPending(false);
    }
  }, [authenticated, tournamentId, publicKey, profile]);

  if (!authenticated) {
    return <LoginButton />;
  }

  if (done) {
    return (
      <span className={`tourney-btn-register tourney-btn-register--done ${className}`.trim()}>
        Registered ✓
      </span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        className={`tourney-btn-register ${className}`.trim()}
        disabled={pending}
        onClick={() => void register()}
      >
        {pending ? "Registering…" : label}
      </button>
      {error && <p className="text-xs text-red-300">{error}</p>}
    </div>
  );
}
