"use client";

import { useCallback, useEffect, useState } from "react";
import { LobbyCard } from "@/components/home/lobby";
import { BtnSecondary } from "@/components/home/lobby";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { REDEMPTION_TIERS, type RedemptionTierId } from "@/lib/rewards";
import { TOKEN_SYMBOL } from "@/lib/constants";

type RedemptionRow = {
  id: string;
  tierId: string;
  pointsSpent: number;
  perkLabel: string;
  status: string;
  createdAt: string;
};

export default function PointRedemptionCard({
  rewardPoints,
  onRedeemed,
}: {
  rewardPoints: number;
  onRedeemed?: (nextPoints: number) => void;
}) {
  const authFetch = useAuthFetch();
  const [redemptions, setRedemptions] = useState<RedemptionRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await authFetch("/api/rewards/redeem");
    if (res.ok) {
      const data = await res.json();
      setRedemptions(data.redemptions ?? []);
    }
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRedeem = async (tierId: RedemptionTierId) => {
    setBusy(tierId);
    setStatus(null);
    try {
      const res = await authFetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "Redemption failed");
        return;
      }
      setStatus(`Redeemed ${data.redemption?.perkLabel} — pending fulfillment`);
      onRedeemed?.(data.rewardPoints ?? rewardPoints);
      await load();
    } catch {
      setStatus("Redemption failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <LobbyCard className="premium-rewards-redemption p-5" hover={false}>
      <div className="mb-4">
        <p className="premium-label">Point redemption</p>
        <p className="mt-1 text-sm text-zinc-400">
          Swap points for {TOKEN_SYMBOL} perks and table credits. Requests are queued and
          fulfilled manually — you&apos;ll see status below.
        </p>
      </div>

      <ul className="premium-redemption-tiers">
        {REDEMPTION_TIERS.map((tier) => {
          const canAfford = rewardPoints >= tier.pointsCost;
          return (
            <li key={tier.id} className="premium-redemption-tier">
              <div className="min-w-0 flex-1">
                <p className="premium-redemption-tier-label">{tier.label}</p>
                <p className="premium-redemption-tier-desc">{tier.description}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="premium-redemption-tier-cost">
                  {tier.pointsCost.toLocaleString()} pts
                </span>
                <BtnSecondary
                  onClick={() => handleRedeem(tier.id)}
                  disabled={!canAfford || busy === tier.id}
                  className="!py-1.5 !text-[10px]"
                >
                  {busy === tier.id ? "…" : canAfford ? "Redeem" : "Need pts"}
                </BtnSecondary>
              </div>
            </li>
          );
        })}
      </ul>

      {status && <p className="mt-3 text-xs text-violet-300">{status}</p>}

      {redemptions.length > 0 && (
        <div className="mt-4 border-t border-white/[0.06] pt-4">
          <p className="premium-label mb-2">Your redemptions</p>
          <ul className="space-y-2">
            {redemptions.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-zinc-400">{r.perkLabel}</span>
                <span
                  className={
                    r.status === "fulfilled"
                      ? "text-emerald-400"
                      : r.status === "pending"
                        ? "text-amber-400"
                        : "text-zinc-500"
                  }
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </LobbyCard>
  );
}
