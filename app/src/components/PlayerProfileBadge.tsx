"use client";

import { useEffect, useState } from "react";

interface Profile {
  name?: string | null;
  twitterHandle?: string | null;
  image?: string | null;
}

export default function PlayerProfileBadge({ wallet }: { wallet: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    fetch(`/api/profile/${wallet}`)
      .then((r) => r.json())
      .then((d) => setProfile(d.profile))
      .catch(() => setProfile(null));
  }, [wallet]);

  if (!profile) {
    return (
      <span className="text-xs text-slate-400">
        {wallet.slice(0, 4)}…{wallet.slice(-4)}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {profile.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={profile.image} alt="" className="h-6 w-6 rounded-full" />
      )}
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-slate-200">
          {profile.name ?? profile.twitterHandle}
        </div>
        {profile.twitterHandle && (
          <div className="text-[10px] text-sky-400">@{profile.twitterHandle}</div>
        )}
      </div>
    </div>
  );
}
