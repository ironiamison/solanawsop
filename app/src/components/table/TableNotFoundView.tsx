"use client";

import Image from "next/image";
import Link from "next/link";
import LobbyAssetImage from "@/components/home/LobbyAssetImage";
import { useState } from "react";
import LoadingPageShell from "@/components/loading/LoadingPageShell";
import { TOKEN_SYMBOL } from "@/lib/constants";
import { setupAllRooms } from "@/lib/program";
import { useLobbyRooms } from "@/hooks/useLobbyRooms";
import { usePokerProgram } from "@/hooks/usePokerProgram";

interface TableNotFoundViewProps {
  roomPubkey: string;
}

export default function TableNotFoundView({ roomPubkey }: TableNotFoundViewProps) {
  const { program, publicKey, authenticated } = usePokerProgram();
  const { rooms, refresh: refreshRooms } = useLobbyRooms();
  const deployedRooms = rooms.filter((r) => r.exists);
  const [status, setStatus] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  const shortPk = `${roomPubkey.slice(0, 6)}…${roomPubkey.slice(-6)}`;

  const handleSetup = async () => {
    if (!program || !publicKey) return;
    setInitializing(true);
    setStatus("Deploying on-chain tables…");
    try {
      const sig = await setupAllRooms(program, publicKey);
      await refreshRooms();
      setStatus(`Tables live · ${sig.slice(0, 8)}…`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setInitializing(false);
    }
  };

  return (
    <LoadingPageShell>
      <div className="table-missing-shell">
        <div className="table-missing-card">
          <div className="table-missing-visual" aria-hidden>
            <LobbyAssetImage
              src="/assets/lobby/poker-table-topdown-3d.png"
              alt=""
              width={320}
              height={200}
              className="table-missing-table-img"
            />
            <span className="table-missing-glow" />
          </div>

          <p className="table-missing-eyebrow">On-chain table</p>
          <h1 className="table-missing-title">Table not deployed</h1>
          <p className="table-missing-copy">
            This room doesn&apos;t exist on devnet yet. Cash game tables are created once per
            stake tier — initialize them with your wallet, or jump into the live demo while you
            wait.
          </p>

          <div className="table-missing-address">
            <span className="table-missing-address-label">Requested room</span>
            <code title={roomPubkey}>{shortPk}</code>
          </div>

          <div className="table-missing-actions">
            <Link href="/" className="table-missing-btn table-missing-btn-primary">
              Back to lobby
            </Link>
            <Link href="/demo" className="table-missing-btn table-missing-btn-secondary">
              Play demo table
            </Link>
            {authenticated && program && publicKey && (
              <button
                type="button"
                onClick={handleSetup}
                disabled={initializing}
                className="table-missing-btn table-missing-btn-outline"
              >
                {initializing ? "Initializing…" : "Initialize tables"}
              </button>
            )}
          </div>

          {status && <p className="table-missing-status">{status}</p>}

          <div className="table-missing-extra">
            {deployedRooms.length > 0 ? (
              <div className="table-missing-rooms">
                <p className="table-missing-rooms-label">Live tables</p>
                <ul className="table-missing-room-list">
                  {deployedRooms.map((room) => (
                    <li key={room.tierIndex}>
                      <Link
                        href={`/table/${room.pubkey.toBase58()}`}
                        className="table-missing-room-link"
                      >
                        <span>{room.label}</span>
                        <span className="table-missing-room-meta">
                          {room.playerCount}/6 · {room.phase}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="table-missing-hint">
                No tables deployed yet — use <strong>Initialize tables</strong> after connecting your
                wallet.
              </p>
            )}
          </div>
        </div>

        <div className="table-missing-footer">
          <span>♦</span>
          <p>
            {TOKEN_SYMBOL} · provably fair · you own your stack
          </p>
        </div>
      </div>
    </LoadingPageShell>
  );
}
