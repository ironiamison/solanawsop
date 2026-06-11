"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  TOKEN_SYMBOL,
  explorerTxUrl,
  formatTokens,
  formatWager,
} from "@/lib/constants";

interface Stats {
  totalBurnedRaw: string;
  totalOtcPaidRaw: string;
  creatorRewardsRaw: string;
  burnTxSignatures: string[];
  pendingRedemptions: number;
}

interface Redemption {
  id: string;
  amountRaw: string;
  status: string;
  createdAt: string;
}

export default function FlywheelDashboard() {
  const { authenticated, getAccessToken } = usePrivy();
  const [stats, setStats] = useState<Stats | null>(null);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/flywheel/stats");
    if (res.ok) setStats(await res.json());
  }, []);

  const loadRedemptions = useCallback(async () => {
    if (!authenticated) return;
    const token = await getAccessToken();
    if (!token) return;
    const res = await fetch("/api/flywheel/redeem", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setRedemptions(data.redemptions ?? []);
    }
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    loadStats();
    loadRedemptions();
  }, [loadStats, loadRedemptions]);

  const handleRedeem = async () => {
    const token = await getAccessToken();
    if (!token) return;
    setPending(true);
    setStatus(null);
    try {
      const res = await fetch("/api/flywheel/redeem", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ amountTokens: parseFloat(amount) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setStatus("OTC request queued — quote paid from creator rewards, tokens burned on completion.");
      setAmount("");
      await loadRedemptions();
      await loadStats();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Request failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total burned"
          value={
            stats ? formatWager(BigInt(stats.totalBurnedRaw)) : "—"
          }
        />
        <StatCard
          label="OTC paid out"
          value={
            stats ? formatWager(BigInt(stats.totalOtcPaidRaw)) : "—"
          }
        />
        <StatCard
          label="Creator rewards"
          value={
            stats ? formatWager(BigInt(stats.creatorRewardsRaw)) : "—"
          }
          highlight
        />
      </div>

      {stats && stats.burnTxSignatures.length > 0 && (
        <div className="surface-card mb-8 rounded-xl p-5">
          <h3 className="section-label mb-3">Burn txs</h3>
          <ul className="space-y-2">
            {stats.burnTxSignatures.slice(0, 5).map((sig) => (
              <li key={sig}>
                <a
                  href={explorerTxUrl(sig)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-xs text-[#e8c547]/80 hover:text-[#e8c547]"
                >
                  {sig.slice(0, 8)}…{sig.slice(-8)} → Solscan
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-card rounded-2xl p-6">
          <h3 className="mb-2 text-sm font-semibold text-zinc-200">
            Redeem winnings
          </h3>
          <p className="mb-4 text-sm text-zinc-500">
            Won tokens at the table? Request an OTC redemption instead of selling
            on the chart. We quote a fair rate from creator-reward revenue and
            burn the tokens we buy back.
          </p>

          {!authenticated ? (
            <p className="text-sm text-zinc-600">Connect to request OTC.</p>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-[11px] text-zinc-600">
                  Amount ({TOKEN_SYMBOL})
                </label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="50000"
                  className="input-field w-40"
                />
              </div>
              <button
                type="button"
                onClick={handleRedeem}
                disabled={pending || !amount}
                className="btn-gold disabled:opacity-50"
              >
                Request OTC
              </button>
            </div>
          )}
          {status && (
            <p className="mt-3 text-sm text-zinc-500">{status}</p>
          )}
          {stats && stats.pendingRedemptions > 0 && (
            <p className="mt-2 text-xs text-zinc-600">
              {stats.pendingRedemptions} in queue
            </p>
          )}
        </div>

        <div className="surface-card rounded-2xl p-6">
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">
            Your requests
          </h3>
          {redemptions.length === 0 ? (
            <p className="text-sm text-zinc-600">None yet.</p>
          ) : (
            <ul className="space-y-2">
              {redemptions.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-sm"
                >
                  <span className="text-[#e8c547]">
                    {formatTokens(BigInt(r.amountRaw))} {TOKEN_SYMBOL}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                      r.status === "completed"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : r.status === "pending"
                          ? "bg-[#e8c547]/10 text-[#e8c547]"
                          : "bg-zinc-800 text-zinc-500"
                    }`}
                  >
                    {r.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="surface-card rounded-xl p-5 text-center">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
        {label}
      </p>
      <p
        className={`mt-2 text-lg font-semibold tabular-nums sm:text-xl ${
          highlight ? "text-[#e8c547]" : "text-zinc-200"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
