"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import GameSidebarNav from "./GameSidebarNav";
import GameTableTopBar from "./GameTableTopBar";

export default function GameplayLayout({
  tableTitle,
  blindsLabel,
  buyInLabel,
  playerCount,
  maxPlayers = 6,
  userLabel,
  userAvatar,
  isDemo = false,
  stack,
  children,
  tableArea,
  actionBar,
  chatDock,
  rightPanel,
  topBanner,
}: {
  tableTitle: string;
  blindsLabel: string;
  buyInLabel: string;
  playerCount: number;
  maxPlayers?: number;
  userLabel: string;
  userAvatar?: string;
  isDemo?: boolean;
  variant?: "live" | "demo";
  stack: number;
  children?: ReactNode;
  tableArea: ReactNode;
  actionBar?: ReactNode;
  chatDock?: ReactNode;
  rightPanel?: ReactNode;
  topBanner?: ReactNode;
}) {
  return (
    <div className="opoker-shell relative h-full min-h-0 flex-1">
      <div className="opoker-bg absolute inset-0" aria-hidden />

      <Suspense fallback={<aside className="opoker-sidebar" />}>
        <GameSidebarNav stack={stack} isDemo={isDemo} />
      </Suspense>

      <main className="opoker-main relative z-10 flex min-w-0 flex-col">
        <GameTableTopBar
          tableTitle={tableTitle}
          blindsLabel={blindsLabel}
          buyInLabel={buyInLabel}
          playerCount={playerCount}
          maxPlayers={maxPlayers}
          userLabel={userLabel}
          userAvatar={userAvatar}
        />

        {children}

        <div className="opoker-table-zone relative flex min-h-0 flex-1 flex-col">
          {topBanner && <div className="opoker-waiting-controls shrink-0">{topBanner}</div>}

          <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-2">
            {tableArea}
          </div>
        </div>

        <footer className="opoker-footer relative z-30 shrink-0">
          {chatDock && (
            <div className="opoker-footer-chat shrink-0">{chatDock}</div>
          )}
          {actionBar && (
            <div className="opoker-footer-actions min-w-0 flex-1">{actionBar}</div>
          )}
        </footer>
      </main>

      {rightPanel && <div className="opoker-right relative z-10 min-h-0">{rightPanel}</div>}
    </div>
  );
}
