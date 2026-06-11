"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { TOKEN_SYMBOL } from "@/lib/constants";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import { usePrivyProfile } from "@/hooks/usePrivyProfile";
import UserAvatar from "./UserAvatar";

type Invite = {
  id: string;
  roomPubkey: string;
  createdAt: string;
  inviter: { name: string | null; twitterHandle: string | null; image: string | null };
};

export default function InvitesPanel() {
  const authFetch = useAuthFetch();
  const profile = usePrivyProfile();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (profile.walletAddress) params.set("wallet", profile.walletAddress);
    if (profile.twitterHandle) params.set("twitter", profile.twitterHandle);
    const res = await authFetch(`/api/tables/invite?${params}`);
    if (res.ok) {
      const data = await res.json();
      setInvites((data.invites ?? []) as Invite[]);
    }
    setLoading(false);
  }, [authFetch, profile.walletAddress, profile.twitterHandle]);

  useEffect(() => {
    if (profile.walletAddress || profile.twitterHandle) load();
  }, [load, profile.walletAddress, profile.twitterHandle]);

  if (loading) {
    return <p className="profile-empty">Loading invites…</p>;
  }

  if (invites.length === 0) {
    return (
      <div className="profile-empty-card">
        <p className="profile-empty-title">No invites yet</p>
        <p className="profile-empty-copy">
          Private SOL table invites will appear here when the feature launches. Play public
          cash games with {TOKEN_SYMBOL} in the meantime.
        </p>
      </div>
    );
  }

  return (
    <ul className="profile-invite-list">
      {invites.map((inv) => (
        <li key={inv.id} className="profile-invite-item">
          <UserAvatar image={inv.inviter?.image} name={inv.inviter?.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="profile-invite-name">
              {inv.inviter?.twitterHandle
                ? `@${inv.inviter.twitterHandle}`
                : inv.inviter?.name ?? "Player"}
            </p>
            <p className="profile-invite-meta">
              Table invite · {new Date(inv.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>
          <Link href={`/table/${inv.roomPubkey}`} className="profile-invite-join">
            Join · {TOKEN_SYMBOL}
          </Link>
        </li>
      ))}
    </ul>
  );
}
