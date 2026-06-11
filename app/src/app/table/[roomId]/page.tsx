"use client";

import TableGameView from "@/components/TableGameView";
import { use } from "react";

export default function TablePage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);

  return (
    <div className="game-table-page relative min-h-screen overflow-hidden bg-[#050408] text-zinc-100">
      <TableGameView roomPubkey={roomId} />
    </div>
  );
}
