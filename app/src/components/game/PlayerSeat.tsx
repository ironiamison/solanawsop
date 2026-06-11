"use client";

import { useEffect, useRef, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import PlayingCard from "@/components/PlayingCard";
import PlayerAvatar from "@/components/social/PlayerAvatar";
import { formatTokens } from "@/lib/constants";
import { playerAvatarUrl } from "@/lib/avatars";
import { holeCardDealDelay } from "@/lib/game/dealOrder";
import { PlayerState } from "@/lib/types";

interface Profile {
  name?: string | null;
  twitterHandle?: string | null;
  image?: string | null;
}

function pseudoLevel(wallet: string): number {
  let n = 0;
  for (let i = 0; i < 6; i++) n += wallet.charCodeAt(i);
  return (n % 89) + 12;
}

function actionLabel(
  player: PlayerState,
  currentBet: number,
  inHand: boolean,
  formatAmount: (n: number) => string
): string | null {
  if (!inHand) return null;
  if (player.status === "folded") return "FOLD";
  if (player.status === "allIn") return "ALL IN";
  if (player.roundBet >= currentBet) return "CHECK";
  if (player.roundBet > 0) {
    return `CALL ${formatAmount(Math.max(0, currentBet - player.roundBet))}`;
  }
  if (currentBet > 0) return `CALL ${formatAmount(currentBet)}`;
  return null;
}

export default function PlayerSeat({
  wallet,
  player,
  isMe,
  isTurn,
  isDealer,
  showHoleCards,
  inHand,
  currentBet,
  seatStyle,
  displayName,
  avatarUrl,
  handLabel,
  folded = false,
  turnSecondsLeft,
  turnProgress,
  seatIndex = 0,
  dealerSeat = 0,
  dealHandId = 0,
  isDealing = false,
  isMucking = false,
  isShowdownReveal = false,
  showdownRevealDelay = 0,
  sittingOut = false,
  formatAmount = formatTokens,
}: {
  wallet: PublicKey;
  player?: PlayerState;
  isMe: boolean;
  isTurn: boolean;
  isDealer: boolean;
  showHoleCards: boolean;
  inHand?: boolean;
  currentBet: number;
  seatStyle: { left: string; top: string; transform: string };
  displayName?: string;
  avatarUrl?: string;
  handLabel?: string | null;
  folded?: boolean;
  turnSecondsLeft?: number;
  turnProgress?: number;
  seatIndex?: number;
  dealerSeat?: number;
  dealHandId?: number;
  isDealing?: boolean;
  isMucking?: boolean;
  isShowdownReveal?: boolean;
  showdownRevealDelay?: number;
  sittingOut?: boolean;
  formatAmount?: (n: number) => string;
}) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [turnEnter, setTurnEnter] = useState(false);
  const wasTurn = useRef(isTurn);
  const w = wallet.toBase58();

  useEffect(() => {
    if (isTurn && !wasTurn.current) {
      setTurnEnter(true);
      const t = setTimeout(() => setTurnEnter(false), 520);
      wasTurn.current = isTurn;
      return () => clearTimeout(t);
    }
    wasTurn.current = isTurn;
  }, [isTurn]);

  useEffect(() => {
    if (displayName || avatarUrl) return;
    fetch(`/api/profile/${w}`)
      .then((r) => r.json())
      .then((d) => setProfile(d.profile))
      .catch(() => setProfile(null));
  }, [w, displayName, avatarUrl]);

  const name =
    displayName ??
    profile?.twitterHandle ??
    profile?.name ??
    (isMe ? "You" : `${w.slice(0, 6)}`);
  const level = pseudoLevel(w);
  const action = player ? actionLabel(player, currentBet, !!inHand, formatAmount) : null;
  const resolvedAvatar =
    avatarUrl ?? profile?.image ?? playerAvatarUrl(displayName ?? name, 96);

  const showCards = player && (isMucking || !folded);
  const seatFoldedClass =
    folded && !isMucking ? "premium-seat-folded" : isMucking ? "premium-seat-mucking" : "";

  const holeCards = showCards ? (
    <div
      className={`${isMe ? "mb-1" : "mt-2"} flex flex-col items-center ${isMe ? "premium-hero-hand" : ""}${isMucking ? " premium-hand-muck" : ""}`}
    >
      <div className="flex gap-1">
        {isDealing && inHand && !isMucking ? (
          [0, 1].map((i) => (
            <div
              key={`deal-${dealHandId}-${i}`}
              className="premium-card-anim-wrap premium-card-deal-in"
              style={{
                animationDelay: `${holeCardDealDelay(seatIndex, dealerSeat, i)}ms`,
              }}
            >
              <PlayingCard
                card={0}
                hidden
                small={!isMe}
                hero={isMe}
                fan={isMe ? (i === 0 ? "left" : "right") : "none"}
              />
            </div>
          ))
        ) : showHoleCards && player.holeCards[0] < 52 ? (
          player.holeCards.map((c, i) => (
            <div
              key={`${dealHandId}-${i}`}
              className={`premium-card-anim-wrap${
                isShowdownReveal && !isMe
                  ? " premium-card-showdown-reveal"
                  : isMe && dealHandId > 0 && !isShowdownReveal
                    ? " premium-card-flip-reveal"
                    : ""
              }`}
              style={
                isShowdownReveal && !isMe
                  ? { animationDelay: `${showdownRevealDelay + i * 140}ms` }
                  : isMe && dealHandId > 0 && !isShowdownReveal
                    ? { animationDelay: `${i * 110}ms` }
                    : undefined
              }
            >
              <PlayingCard
                card={c}
                small={!isMe}
                hero={isMe}
                fan={isMe ? (i === 0 ? "left" : "right") : "none"}
              />
            </div>
          ))
        ) : (
          <>
            <div className={isMucking ? "premium-card-anim-wrap premium-card-muck" : ""}>
              <PlayingCard card={0} hidden small={!isMe} hero={isMe} fan={isMe ? "left" : "none"} />
            </div>
            <div
              className={isMucking ? "premium-card-anim-wrap premium-card-muck" : ""}
              style={isMucking ? { animationDelay: "80ms" } : undefined}
            >
              <PlayingCard card={0} hidden small={!isMe} hero={isMe} fan={isMe ? "right" : "none"} />
            </div>
          </>
        )}
      </div>
      {isMe && handLabel && (
        <span className="premium-hand-rank mt-2">{handLabel}</span>
      )}
    </div>
  ) : null;

  return (
    <div
      className={`premium-seat absolute z-20 ${seatFoldedClass} ${isMe ? "premium-seat-hero" : ""}`}
      style={seatStyle}
    >
      {sittingOut && <span className="premium-sitout-badge">Sit out</span>}
      {isMucking && <span className="premium-fold-badge">Fold</span>}
      {isTurn && (
        <span className="premium-turn-action-badge">
          {isMe ? "Your turn" : "Acting"}
          {turnSecondsLeft !== undefined && (
            <span className="premium-turn-seconds">{turnSecondsLeft}s</span>
          )}
        </span>
      )}
      {isMe && holeCards}
      <div
        className={`premium-seat-inner flex items-center gap-2${isTurn ? " premium-seat-turn-active" : ""}${turnEnter ? " premium-seat-turn-enter" : ""}`}
      >
        <div className="relative shrink-0">
          {isDealer && <span className="premium-dealer-btn">D</span>}
          {isTurn && <span className="premium-turn-orbit" aria-hidden />}
          <div
            className={`premium-avatar ${isMe ? "premium-avatar-hero" : ""} ${isTurn ? (turnEnter ? "premium-avatar-turn-enter" : "premium-avatar-turn") : ""}`}
          >
            <div className="premium-avatar-img">
              <PlayerAvatar
                image={resolvedAvatar}
                seed={displayName ?? name}
                name={name}
                size="md"
                online
              />
            </div>
            <span className="premium-level">{level}</span>
            <span className="premium-online" />
          </div>
        </div>

        <div className={`premium-seat-glass min-w-[92px]${isTurn && turnEnter ? " premium-seat-glass-turn" : ""}`}>
          <p className="truncate text-[11px] font-semibold text-white">
            {isMe ? "You" : name}
          </p>
          {player && (
            <p className="text-[11px] font-bold tabular-nums text-zinc-100">
              {formatAmount(player.stack)}
            </p>
          )}
          {action && (
            <p className={`premium-action-label ${folded ? "premium-action-fold" : ""}`}>
              {action}
            </p>
          )}
        </div>
      </div>

      {isTurn && turnProgress !== undefined && (
        <div className="premium-turn-timer mt-1.5" key={turnEnter ? "enter" : "hold"}>
          <div
            className={`premium-turn-timer-fill${
              turnSecondsLeft !== undefined && turnSecondsLeft <= 10
                ? " premium-turn-timer-fill-urgent"
                : ""
            }`}
            style={{ transform: `scaleX(${turnProgress})` }}
          />
        </div>
      )}

      {!isMe && holeCards}
    </div>
  );
}
