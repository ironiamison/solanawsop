"use client";

import Link from "next/link";
import { RoomState } from "@/lib/types";
import { TOKEN_SYMBOL } from "@/lib/constants";
import {
  explorerAccountUrl,
  explorerInstructionUrl,
  explorerProgramUrl,
} from "@/lib/fairness/explorer";
import { PROGRAM_ID_TEXT } from "@/lib/fairness/modes";

export default function TableVerificationCard({
  room,
  roomPubkey,
  lastTxSig,
}: {
  room: RoomState;
  roomPubkey: string;
  lastTxSig?: string | null;
}) {
  return (
    <div className="opoker-panel-card opoker-panel-card-accent p-3">
      <h3 className="opoker-panel-title text-violet-400">Verify on-chain</h3>
      <p className="mt-1 text-[10px] leading-relaxed text-zinc-500">
        Real {TOKEN_SYMBOL} sits in a program vault. Join, actions, and leave are Solana
        transactions — not server balances.
      </p>

      <dl className="mt-3 space-y-2 text-[10px]">
        <div>
          <dt className="font-bold uppercase tracking-wider text-zinc-600">Program</dt>
          <dd className="mt-0.5 font-mono text-zinc-400">
            <a
              href={explorerProgramUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline"
            >
              {PROGRAM_ID_TEXT.slice(0, 8)}…
            </a>
          </dd>
        </div>
        <div>
          <dt className="font-bold uppercase tracking-wider text-zinc-600">Room</dt>
          <dd className="mt-0.5 break-all font-mono text-zinc-400">
            <a
              href={explorerAccountUrl(roomPubkey)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-violet-400 hover:underline"
            >
              {roomPubkey.slice(0, 12)}…
            </a>
          </dd>
        </div>
        {room.handNumber != null && room.handNumber > 0 && (
          <div>
            <dt className="font-bold uppercase tracking-wider text-zinc-600">Hand</dt>
            <dd className="mt-0.5 tabular-nums text-zinc-300">#{room.handNumber}</dd>
          </div>
        )}
        {room.gameSeed != null && room.gameSeed > BigInt(0) && (
          <div>
            <dt className="font-bold uppercase tracking-wider text-zinc-600">Deal seed</dt>
            <dd className="mt-0.5 break-all font-mono text-[9px] text-zinc-500">
              {room.gameSeed.toString()}
            </dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex flex-col gap-1.5">
        {lastTxSig ? (
          <a
            href={explorerInstructionUrl(lastTxSig)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-semibold text-violet-400 hover:underline"
          >
            Latest action on Solscan →
          </a>
        ) : (
          <p className="text-[10px] text-zinc-600">Your next action appears on Solscan.</p>
        )}
        <Link href="/fairness" className="text-[10px] font-semibold text-zinc-500 hover:text-violet-300">
          Full fairness & limits →
        </Link>
      </div>

      <p className="mt-2 text-[9px] leading-relaxed text-amber-200/70">
        Shuffle uses slot-based seed today; VRF + hidden hole cards on roadmap. See docs.
      </p>
    </div>
  );
}
