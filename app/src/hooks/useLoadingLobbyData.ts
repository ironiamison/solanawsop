"use client";

import { useEffect, useState } from "react";
import { useLobbyRooms } from "@/hooks/useLobbyRooms";

export interface LoadingActivityItem {
  id: string;
  user: string;
  action: string;
  amountLabel: string;
  image: string | null;
  createdAt: string;
}

function formatTimeAgo(iso: string): string {
  const sec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86_400)}d ago`;
}

export function useLoadingLobbyData(overrides?: {
  playersOnline?: number;
  tablesActive?: number;
  /** Parent already fetches rooms — avoid duplicate RPC while splash is up */
  skipRoomFetch?: boolean;
}) {
  const lobby = useLobbyRooms();
  const onlinePlayers = overrides?.skipRoomFetch ? 0 : lobby.onlinePlayers;
  const activeTables = overrides?.skipRoomFetch ? 0 : lobby.activeTables;
  const roomsLoading = overrides?.skipRoomFetch ? false : lobby.loading;
  const [activity, setActivity] = useState<LoadingActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const [, tick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/activity/recent?limit=5")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setActivity(d.events ?? []);
      })
      .catch(() => {
        if (!cancelled) setActivity([]);
      })
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (activity.length === 0) return;
    const id = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [activity.length]);

  const playersOnline =
    overrides?.playersOnline !== undefined ? overrides.playersOnline : onlinePlayers;
  const tablesActive =
    overrides?.tablesActive !== undefined ? overrides.tablesActive : activeTables;

  return {
    playersOnline,
    tablesActive,
    statsReady: overrides?.playersOnline !== undefined || !roomsLoading,
    activity: activity.map((item) => ({
      ...item,
      ago: formatTimeAgo(item.createdAt),
    })),
    activityLoading,
  };
}
