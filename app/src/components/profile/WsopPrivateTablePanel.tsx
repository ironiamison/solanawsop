"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePrivy } from "@privy-io/react-auth";
import {
  BUY_IN_TIERS,
  TOKEN_SYMBOL,
  formatTokens,
} from "@/lib/constants";
import { wsopTablePlayUrl } from "@/lib/wsop-private/tables";
import { usePokerProgram } from "@/hooks/usePokerProgram";
import GuestInfoBox from "@/components/ui/GuestInfoBox";

type TableRow = {
  id: string;
  roomId: string;
  name: string | null;
  buyInRaw: string;
  tierLabel: string;
};

export default function WsopPrivateTablePanel() {
  const { publicKey } = usePokerProgram();
  const { getAccessToken } = usePrivy();
  const [tierIndex, setTierIndex] = useState(1);
  const [tableName, setTableName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [tables, setTables] = useState<TableRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    if (!publicKey) return;
    const res = await fetch(
      `/api/wsop-table?wallet=${publicKey.toBase58()}`
    );
    const data = await res.json();
    setTables(data.tables ?? []);
  }, [publicKey]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const authHeaders = async () => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const copyLink = async (roomId: string) => {
    try {
      await navigator.clipboard.writeText(wsopTablePlayUrl(roomId));
      setCopied(roomId);
      setTimeout(() => setCopied(null), 2200);
    } catch {
      setStatus("Could not copy link");
    }
  };

  const handleCreate = async () => {
    if (!publicKey) return;
    setPending(true);
    setStatus("Creating table…");
    try {
      const res = await fetch("/api/wsop-table", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          creatorWallet: publicKey.toBase58(),
          tierIndex,
          name: tableName || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Create failed");
      setSelectedRoom(data.table.roomId);
      setStatus("Table live — share the invite link.");
      await loadTables();
      await copyLink(data.table.roomId);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to create table");
    } finally {
      setPending(false);
    }
  };

  const handleInvite = async () => {
    if (!selectedRoom || !inviteInput.trim()) return;
    setPending(true);
    setStatus("Adding guest…");
    try {
      const res = await fetch(`/api/wsop-table/${selectedRoom}/invite`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ inviteeWallet: inviteInput.trim() }),
      });
      const data = await res.json();
      if (!data.ok && data.error) throw new Error(data.error);
      setStatus("Guest added — they can open your invite link.");
      setInviteInput("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setPending(false);
    }
  };

  if (!publicKey) {
    return (
      <GuestInfoBox>
        Connect your wallet to host invite-only {TOKEN_SYMBOL} private tables.
      </GuestInfoBox>
    );
  }

  return (
    <div className="private-tables-panel">
      <div className="private-tables-soon-features mb-4">
        {[
          { label: "Wager", value: TOKEN_SYMBOL },
          { label: "Access", value: "Invite link" },
          { label: "Status", value: "Live" },
        ].map((item) => (
          <div key={item.label} className="private-tables-soon-stat">
            <p className="private-tables-soon-stat-label">{item.label}</p>
            <p className="private-tables-soon-stat-value">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="private-tables-create">
        <div className="private-tables-create-fields">
          <label className="private-tables-field">
            <span>Table name</span>
            <input
              type="text"
              placeholder="Crew game"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="profile-input"
            />
          </label>
          <label className="private-tables-field private-tables-field--buyin">
            <span>Buy-in ({TOKEN_SYMBOL})</span>
            <select
              value={tierIndex}
              onChange={(e) => setTierIndex(Number(e.target.value))}
              className="profile-input"
            >
              {BUY_IN_TIERS.map((t) => (
                <option key={t.index} value={t.index}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleCreate}
            disabled={pending}
            className="private-tables-create-btn"
          >
            {pending ? "Creating…" : "Create table"}
          </button>
        </div>
      </div>

      {tables.length > 0 && (
        <ul className="private-tables-list">
          {tables.map((t) => {
            const isSelected = selectedRoom === t.roomId;
            return (
              <li
                key={t.id}
                className={`private-tables-item${isSelected ? " private-tables-item-active" : ""}`}
              >
                <div className="private-tables-item-main">
                  <p className="private-tables-item-name">{t.name ?? "Private table"}</p>
                  <p className="private-tables-item-meta">
                    {t.tierLabel} · {formatTokens(BigInt(t.buyInRaw))} stack
                  </p>
                </div>
                <div className="private-tables-item-actions">
                  <button
                    type="button"
                    className="private-tables-item-btn"
                    onClick={() => setSelectedRoom(t.roomId)}
                  >
                    Manage
                  </button>
                  <button
                    type="button"
                    className="private-tables-item-btn"
                    onClick={() => copyLink(t.roomId)}
                  >
                    {copied === t.roomId ? "Copied!" : "Copy link"}
                  </button>
                  <Link
                    href={`/wsop-table/${t.roomId}`}
                    className="private-tables-item-btn private-tables-item-btn-play"
                  >
                    Play
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selectedRoom && (
        <div className="private-tables-invite mt-4">
          <p className="private-tables-steps-label">Invite a guest</p>
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              placeholder="Wallet or @handle"
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              className="profile-input min-w-[200px] flex-1"
            />
            <button
              type="button"
              onClick={handleInvite}
              disabled={pending}
              className="private-tables-create-btn"
            >
              Add guest
            </button>
          </div>
        </div>
      )}

      {status && <p className="private-tables-soon-foot mt-3">{status}</p>}
    </div>
  );
}
