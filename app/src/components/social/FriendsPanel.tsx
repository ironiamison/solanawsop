"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BtnSecondary } from "@/components/home/lobby";
import { useAuthFetch } from "@/hooks/useAuthFetch";
import type { PublicUser } from "@/lib/social";
import UserAvatar from "./UserAvatar";

type FriendRow = { friendshipId: string; user: PublicUser; since: string };

export default function FriendsPanel({ compact = false }: { compact?: boolean }) {
  const authFetch = useAuthFetch();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [incoming, setIncoming] = useState<FriendRow[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRow[]>([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PublicUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/friends");
      if (!res.ok) return;
      const data = await res.json();
      setFriends(data.friends ?? []);
      setIncoming(data.incoming ?? []);
      setOutgoing(data.outgoing ?? []);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const q = query.trim().replace(/^@/, "");
    if (q.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await authFetch(`/api/users/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.users ?? []);
        }
      } finally {
        setSearching(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [query, authFetch]);

  const addFriend = async (handleOrQuery?: string) => {
    const target = (handleOrQuery ?? query).trim();
    if (!target) return;
    setStatus("Sending…");
    const res = await authFetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: target }),
    });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data.error ?? "Failed");
      return;
    }
    setQuery("");
    setSuggestions([]);
    setStatus("Request sent");
    load();
  };

  const respond = async (friendshipId: string, action: "accept" | "decline") => {
    await authFetch("/api/friends", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendshipId, action }),
    });
    load();
  };

  const displayFriends = compact ? friends.slice(0, 5) : friends;

  return (
    <div className="space-y-4">
      {!compact && (
        <div className="relative">
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search X profiles — @handle"
              className="profile-input flex-1"
              onKeyDown={(e) => e.key === "Enter" && addFriend()}
            />
            <BtnSecondary onClick={() => addFriend()} className="shrink-0 px-5">
              Add friend
            </BtnSecondary>
          </div>
          {suggestions.length > 0 && (
            <ul className="ui-dropdown absolute z-20 mt-1 w-full">
              {suggestions.map((u) => (
                <li key={u.id}>
                  <button
                    type="button"
                    onClick={() => addFriend(u.twitterHandle ? `@${u.twitterHandle}` : u.walletAddress ?? "")}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-violet-500/10"
                  >
                    <UserAvatar image={u.image} name={u.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-200">
                        {u.twitterHandle ? `@${u.twitterHandle}` : u.name ?? "Player"}
                      </p>
                      <p className="text-[11px] text-zinc-600">
                        {u.handsWon} wins · {(u.rewardPoints ?? 0).toLocaleString()} pts
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-violet-400">Add</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searching && query.length >= 2 && suggestions.length === 0 && (
            <p className="mt-1 text-[11px] text-zinc-600">Searching players…</p>
          )}
        </div>
      )}
      {status && <p className="text-xs text-zinc-500">{status}</p>}

      {incoming.length > 0 && (
        <section>
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-amber-500">
            Friend requests · {incoming.length}
          </h3>
          <ul className="space-y-2">
            {incoming.map((row) => (
              <li key={row.friendshipId} className="ui-row ui-row--highlight px-1">
                <UserAvatar image={row.user.image} name={row.user.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-zinc-200">
                    {row.user.twitterHandle
                      ? `@${row.user.twitterHandle}`
                      : row.user.name ?? "Player"}
                  </p>
                  {row.user.name && row.user.twitterHandle && (
                    <p className="text-[11px] text-zinc-500">{row.user.name}</p>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <BtnSecondary
                    onClick={() => respond(row.friendshipId, "accept")}
                    className="!border-emerald-500/30 !text-emerald-400"
                  >
                    Accept
                  </BtnSecondary>
                  <BtnSecondary onClick={() => respond(row.friendshipId, "decline")}>
                    Decline
                  </BtnSecondary>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
            Friends · {friends.length}
          </h3>
          {compact && friends.length > 5 && (
            <Link href="/friends" className="text-[11px] font-semibold text-violet-400">
              View all →
            </Link>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-zinc-600">Loading…</p>
        ) : displayFriends.length === 0 ? (
          <p className="ui-empty">
            No friends yet — search by @handle or paste a wallet address.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {displayFriends.map((row) => (
              <li key={row.friendshipId}>
                <Link href={`/messages?peer=${row.user.id}`} className="ui-row px-1">
                  <UserAvatar image={row.user.image} name={row.user.name} size="sm" online />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {row.user.twitterHandle
                        ? `@${row.user.twitterHandle}`
                        : row.user.name ?? "Player"}
                    </p>
                    <p className="text-[11px] text-zinc-600">
                      {row.user.handsWon} wins · {row.user.handsPlayed} hands
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">
                    Message
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!compact && outgoing.length > 0 && (
        <section>
          <h3 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-zinc-600">
            Pending sent · {outgoing.length}
          </h3>
          <ul className="space-y-1.5">
            {outgoing.map((row) => (
              <li key={row.friendshipId} className="ui-row px-1 opacity-70">
                <UserAvatar image={row.user.image} name={row.user.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-zinc-400">
                    {row.user.twitterHandle ? `@${row.user.twitterHandle}` : "Player"}
                  </p>
                </div>
                <span className="text-[10px] text-zinc-600">Pending</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
