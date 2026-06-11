"use client";

import { useCallback, useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import {
  formatTokens,
  PRIVATE_TABLE_RAKE_PERCENT,
  PRIVATE_TABLES_ENABLED,
  TOKEN_DECIMALS,
  TOKEN_SYMBOL,
} from "@/lib/constants";
import GuestInfoBox from "@/components/ui/GuestInfoBox";
import { tableInviteUrl } from "@/lib/table-invites";
import { createPrivateTable, invitePlayer } from "@/lib/program";
import { privateRoomPda } from "@/lib/pdas";
import { usePokerProgram } from "@/hooks/usePokerProgram";
import BrandWordLockup from "@/components/brand/BrandWordLockup";

type TableRow = {
  id: string;
  roomPubkey: string;
  name: string | null;
  buyInLamports: string;
  tableId: string;
};

const PREVIEW_STEPS = [
  "Create an invite-only table with a custom SOL buy-in.",
  "Share a direct link — add guests by wallet or @handle.",
  `Play for SOL with a ${PRIVATE_TABLE_RAKE_PERCENT}% platform rake per pot.`,
];

function PrivateTablesComingSoon() {
  return (
    <div className="private-tables-panel">
      <div className="private-tables-soon-hero">
        <div className="private-tables-soon-chip" aria-hidden>
          <BrandWordLockup size="lg" showTagline />
        </div>
        <div className="private-tables-soon-head">
          <span className="premium-coming-soon-badge">Coming soon</span>
          <p className="private-tables-soon-title">Private tables · SOL (on-chain)</p>
          <p className="private-tables-soon-copy">
            Host invite-only games with real SOL buy-ins, direct invite links, and on-chain
            guest lists. Public cash games stay on {TOKEN_SYMBOL}.
          </p>
        </div>
        <div className="private-tables-soon-features">
          {[
            { label: "Wager", value: "SOL" },
            { label: "Rake", value: `${PRIVATE_TABLE_RAKE_PERCENT}% / pot` },
            { label: "Invites", value: "Link + @handle" },
          ].map((item) => (
            <div key={item.label} className="private-tables-soon-stat">
              <p className="private-tables-soon-stat-label">{item.label}</p>
              <p className="private-tables-soon-stat-value">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="private-tables-steps private-tables-steps--muted">
        <p className="private-tables-steps-label">What&apos;s launching</p>
        <ol>
          {PREVIEW_STEPS.map((step, i) => (
            <li key={step}>
              <span className="private-tables-step-num">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="private-tables-create private-tables-create--preview" aria-hidden>
        <div className="private-tables-create-fields">
          <label className="private-tables-field">
            <span>Table name</span>
            <input
              type="text"
              placeholder="Friday night crew"
              disabled
              className="profile-input"
            />
          </label>
          <label className="private-tables-field private-tables-field--buyin">
            <span>Buy-in (SOL)</span>
            <input type="text" value="0.1" disabled className="profile-input" />
          </label>
          <button type="button" disabled className="private-tables-create-btn">
            Create table
          </button>
        </div>
      </div>

      <p className="private-tables-soon-foot">
        Play public cash games and demo tables today — private SOL rooms unlock in the next release.
      </p>
    </div>
  );
}

function PrivateTablesLive() {
  const { program, publicKey } = usePokerProgram();
  const { getAccessToken } = usePrivy();
  const [buyIn, setBuyIn] = useState("10000");
  const [tableName, setTableName] = useState("");
  const [inviteInput, setInviteInput] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [tables, setTables] = useState<TableRow[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [copiedRoom, setCopiedRoom] = useState<string | null>(null);

  const loadTables = useCallback(async () => {
    if (!publicKey) return;
    const res = await fetch(
      `/api/tables/private?wallet=${publicKey.toBase58()}`
    );
    const data = await res.json();
    setTables(data.tables ?? []);
  }, [publicKey]);

  useEffect(() => {
    loadTables();
  }, [loadTables]);

  const authHeaders = async (): Promise<Record<string, string>> => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const copyInviteLink = async (roomPubkey: string) => {
    try {
      await navigator.clipboard.writeText(tableInviteUrl(roomPubkey));
      setCopiedRoom(roomPubkey);
      setTimeout(() => setCopiedRoom(null), 2200);
    } catch {
      setStatus("Could not copy link");
    }
  };

  const handleCreate = async () => {
    if (!program || !publicKey) return;
    setPending(true);
    setStatus("Creating private table on-chain…");
    try {
      const tableId = BigInt(Date.now());
      const human = parseFloat(buyIn);
      const buyInRaw = Math.floor(human * 10 ** TOKEN_DECIMALS);
      if (buyInRaw < 10_000 * 10 ** TOKEN_DECIMALS) {
        throw new Error(`Minimum buy-in is 10K ${TOKEN_SYMBOL}`);
      }
      await createPrivateTable(program, publicKey, buyInRaw, tableId);
      const [room] = privateRoomPda(publicKey, tableId);
      const roomPubkey = room.toBase58();

      await fetch("/api/tables/private", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          roomPubkey,
          creatorWallet: publicKey.toBase58(),
          tableId: tableId.toString(),
          buyInLamports: buyInRaw.toString(),
          name: tableName || undefined,
        }),
      });

      setSelectedRoom(roomPubkey);
      setStatus("Table created — copy the invite link and add guests.");
      await loadTables();
      await copyInviteLink(roomPubkey);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Failed to create table");
    } finally {
      setPending(false);
    }
  };

  const handleInvite = async () => {
    if (!program || !publicKey || !selectedRoom || !inviteInput.trim()) return;
    setPending(true);
    setStatus("Sending on-chain invite…");
    try {
      let inviteeWallet = inviteInput.trim();

      if (inviteeWallet.startsWith("@")) {
        const res = await fetch(
          `/api/profile/by-twitter/${inviteeWallet.slice(1)}`
        );
        const data = await res.json();
        if (!data.user?.walletAddress) {
          throw new Error("Twitter user has no linked wallet");
        }
        inviteeWallet = data.user.walletAddress;
      }

      const invitee = new PublicKey(inviteeWallet);
      const room = new PublicKey(selectedRoom);

      await invitePlayer(program, publicKey, room, invitee);

      await fetch("/api/tables/invite", {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          roomPubkey: selectedRoom,
          inviteeWallet,
          inviteeTwitter: inviteInput.startsWith("@")
            ? inviteInput.slice(1)
            : undefined,
        }),
      });

      setStatus("Guest added — they can open your invite link and take a seat.");
      setInviteInput("");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Invite failed");
    } finally {
      setPending(false);
    }
  };

  if (!publicKey) {
    return (
      <div className="profile-empty-card">
        <p className="profile-empty-title">Wallet required</p>
        <GuestInfoBox className="mt-3">
          Connect in the top bar to create private SOL tables and share invite links.
        </GuestInfoBox>
      </div>
    );
  }

  const selectedTable = tables.find((t) => t.roomPubkey === selectedRoom);

  return (
    <div className="private-tables-panel">
      <div className="private-tables-steps">
        <p className="private-tables-steps-label">How it works</p>
        <ol>
          {PREVIEW_STEPS.map((step, i) => (
            <li key={step}>
              <span className="private-tables-step-num">{i + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <div className="private-tables-create">
        <div className="private-tables-create-fields">
          <label className="private-tables-field">
            <span>Table name</span>
            <input
              type="text"
              placeholder="Friday night crew"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="profile-input"
            />
          </label>
          <label className="private-tables-field private-tables-field--buyin">
            <span>Buy-in ({TOKEN_SYMBOL})</span>
            <input
              type="number"
              step="1000"
              min="10000"
              value={buyIn}
              onChange={(e) => setBuyIn(e.target.value)}
              className="profile-input"
            />
          </label>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!program || pending}
            className="private-tables-create-btn"
          >
            {pending ? "Creating…" : "Create table"}
          </button>
        </div>
      </div>

      {tables.length > 0 && (
        <ul className="private-tables-list">
          {tables.map((t) => {
            const link = tableInviteUrl(t.roomPubkey);
            const isSelected = selectedRoom === t.roomPubkey;
            return (
              <li key={t.id} className={`private-tables-item${isSelected ? " private-tables-item-active" : ""}`}>
                <div className="private-tables-item-main">
                  <p className="private-tables-item-name">{t.name ?? "Private table"}</p>
                  <p className="private-tables-item-meta">
                    {formatTokens(Number(t.buyInLamports))} {TOKEN_SYMBOL}
                  </p>
                  <p className="private-tables-item-link" title={link}>
                    {link.replace(/^https?:\/\//, "")}
                  </p>
                </div>
                <div className="private-tables-item-actions">
                  <button
                    type="button"
                    onClick={() => copyInviteLink(t.roomPubkey)}
                    className="private-tables-action private-tables-action-primary"
                  >
                    {copiedRoom === t.roomPubkey ? "Copied!" : "Copy link"}
                  </button>
                  <Link href={`/table/${t.roomPubkey}`} className="private-tables-action">
                    Open
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedRoom(t.roomPubkey)}
                    className={`private-tables-action${isSelected ? " private-tables-action-active" : ""}`}
                  >
                    Invite
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selectedRoom && (
        <div className="private-tables-invite-box">
          <p className="private-tables-invite-title">
            Add guest{selectedTable?.name ? ` · ${selectedTable.name}` : ""}
          </p>
          <p className="private-tables-invite-hint">
            Wallet address or @X handle — required on-chain before they can join via your link.
          </p>
          <div className="private-tables-invite-row">
            <input
              value={inviteInput}
              onChange={(e) => setInviteInput(e.target.value)}
              placeholder="wallet or @handle"
              className="profile-input flex-1"
            />
            <button
              type="button"
              onClick={handleInvite}
              disabled={pending || !inviteInput.trim()}
              className="private-tables-create-btn private-tables-create-btn--sm"
            >
              Add guest
            </button>
          </div>
          <div className="private-tables-link-row">
            <input readOnly value={tableInviteUrl(selectedRoom)} className="profile-input private-tables-link-input" />
            <button
              type="button"
              onClick={() => copyInviteLink(selectedRoom)}
              className="private-tables-action private-tables-action-primary"
            >
              {copiedRoom === selectedRoom ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>
      )}

      {status && <p className="private-tables-status">{status}</p>}
    </div>
  );
}

export default function PrivateTablePanel() {
  if (!PRIVATE_TABLES_ENABLED) {
    return <PrivateTablesComingSoon />;
  }
  return <PrivateTablesLive />;
}
