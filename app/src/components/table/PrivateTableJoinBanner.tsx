"use client";

import { useCallback, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { tableInviteUrl } from "@/lib/table-invites";
import { formatWagerSol, PRIVATE_TABLE_RAKE_PERCENT } from "@/lib/constants";

type Props = {
  roomPubkey: string;
  buyIn: number;
  tableName?: string | null;
  isCreator: boolean;
  isInvited: boolean;
  walletAddress?: string | null;
};

export default function PrivateTableJoinBanner({
  roomPubkey,
  buyIn,
  tableName,
  isCreator,
  isInvited,
  walletAddress,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [walletCopied, setWalletCopied] = useState(false);
  const inviteLink = tableInviteUrl(roomPubkey);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // ignore
    }
  }, [inviteLink]);

  const copyWallet = useCallback(async () => {
    if (!walletAddress) return;
    try {
      await navigator.clipboard.writeText(walletAddress);
      setWalletCopied(true);
      setTimeout(() => setWalletCopied(false), 2200);
    } catch {
      // ignore
    }
  }, [walletAddress]);

  return (
    <div className="private-table-banner">
      <div className="private-table-banner-head">
        <span className="private-table-banner-pill">Private table</span>
        <p className="private-table-banner-title">{tableName ?? "Invite-only game"}</p>
        <p className="private-table-banner-meta">
          Buy-in {formatWagerSol(buyIn)} · {PRIVATE_TABLE_RAKE_PERCENT}% rake per pot
        </p>
      </div>

      {isCreator ? (
        <div className="private-table-banner-body">
          <p className="private-table-banner-copy">
            Share your direct invite link. Guests still need an on-chain invite — add their wallet
            or @handle from Profile → Private tables. Each pot pays a {PRIVATE_TABLE_RAKE_PERCENT}%
            platform rake in SOL.
          </p>
          <div className="private-table-link-row">
            <input readOnly value={inviteLink} className="private-table-link-input" />
            <button type="button" onClick={copyLink} className="private-table-link-btn">
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        </div>
      ) : isInvited ? (
        <p className="private-table-banner-copy private-table-banner-copy--ok">
          You&apos;re on the guest list — take a seat when ready.
        </p>
      ) : (
        <div className="private-table-banner-body">
          <p className="private-table-banner-copy">
            This table is invite-only. Ask the host to approve your wallet, or open the link they
            sent after they&apos;ve added you.
          </p>
          {walletAddress && (
            <div className="private-table-link-row">
              <input readOnly value={walletAddress} className="private-table-link-input" />
              <button type="button" onClick={copyWallet} className="private-table-link-btn">
                {walletCopied ? "Copied!" : "Copy wallet"}
              </button>
            </div>
          )}
          <button type="button" onClick={copyLink} className="private-table-link-secondary">
            {copied ? "Link copied" : "Copy table link for host"}
          </button>
        </div>
      )}
    </div>
  );
}

/** Whether wallet appears in room invited list (excludes default pubkey). */
export function isWalletInvited(
  invited: PublicKey[],
  wallet: PublicKey | null | undefined
): boolean {
  if (!wallet) return false;
  return invited.some((pk) => !pk.equals(PublicKey.default) && pk.equals(wallet));
}
