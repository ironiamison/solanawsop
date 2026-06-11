"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useState } from "react";

export type SocialCounts = {
  unreadMessages: number;
  pendingFriends: number;
  tableInvites: number;
};

const EMPTY: SocialCounts = { unreadMessages: 0, pendingFriends: 0, tableInvites: 0 };

export function useSocialCounts() {
  const { authenticated, getAccessToken } = usePrivy();
  const [counts, setCounts] = useState<SocialCounts>(EMPTY);

  const refresh = useCallback(async () => {
    if (!authenticated) {
      setCounts(EMPTY);
      return;
    }
    const token = await getAccessToken();
    if (!token) return;
    try {
      const res = await fetch("/api/social/counts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setCounts(await res.json());
    } catch {
      /* ignore */
    }
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30_000);
    return () => clearInterval(id);
  }, [refresh]);

  return { counts, refresh };
}
