# SolanaWSOP

On-chain Texas Hold'em on Solana. **Public cash games** use `$SWSOP` play chips (off-chain engine; wallet for identity). **SOL private tables** (optional) use on-chain vault escrow with a 10% platform rake per pot.

## Architecture

- **Anchor program** (`programs/solana_poker`) — rooms, SOL vault escrow, betting, hand evaluation, private invite-only tables, **10% rake on private pots**
- **Next.js app** (`app/`) — Privy auth, lobby, table UI, profiles, rewards, leaderboard
- **Custom server** (`server.ts` + Socket.io) — table chat and WebRTC voice signaling
- **Prisma (SQLite)** — profiles, friends, DMs, invites, reward points, redemptions

## Quick start

### 1. Program (devnet)

Requires Solana CLI + Anchor 0.31+ with `cargo-build-sbf`:

```bash
chmod +x scripts/deploy-program.sh
./scripts/deploy-program.sh devnet
```

After deploy, set in `app/.env.local`:

```bash
NEXT_PUBLIC_PRIVATE_TABLES_ENABLED=true
```

### 2. App environment

```bash
cd app
cp .env.local.example .env.local
```

Set [Privy](https://dashboard.privy.io) credentials and `NEXT_PUBLIC_APP_URL` for production invite/referral links.

```bash
npm install
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 3. First session

1. **Demo** — `/demo` — no wallet, free play chips
2. **Connect** — Privy (wallet, X, email)
3. **Initialize tables** — lobby banner (one-time devnet setup)
4. **Play** — pick a cash game tier → `/table/[roomId]`
5. **Profile** — rewards, friends, referrals, point redemption

## Game modes

| Mode | Wager | Status |
|------|-------|--------|
| Demo table | Play chips | Live |
| Public cash games | `$SWSOP` play chips | Live (UI); on-chain SOL tiers legacy |
| Private tables | SOL + 10% rake | Set `NEXT_PUBLIC_PRIVATE_TABLES_ENABLED=true` after deploy |

## Features

- **Reward points** — hands played, referrals, X verify
- **Point redemption** — Profile → Rewards (queued fulfillment)
- **Friends & DMs** — search by @handle or wallet
- **Leaderboard** — global wins and points
- **Table notes** — local per-table (Notes tab in chat dock)
- **Direct invite links** — `/table/{roomPubkey}` (private tables, when enabled)

## Program instructions

| Instruction | Description |
|-------------|-------------|
| `initialize_config` | One-time global setup |
| `initialize_room` | Public room for a buy-in tier |
| `create_private_table` | Invite-only SOL table |
| `invite_player` | On-chain guest list |
| `join_room` / `leave_room` | Seat + buy-in |
| `start_hand` / `player_action` / `advance_street` | Gameplay |

Private-table hand resolution takes **10% rake** from each pot to the config authority wallet.

## Testing

```bash
anchor test   # from repo root, requires build toolchain
cd app && npm run build
```

## Fairness & verification

See **[FAIRNESS.md](./FAIRNESS.md)** for what is verifiable on-chain (SPL escrow, payouts, txs) vs what is not yet (VRF shuffle, hidden hole cards). In-app: [/fairness](http://localhost:3001/fairness) and the **Verify on-chain** panel at cash tables.

| Verifiable today | Not yet |
|------------------|---------|
| SPL buy-in / cash-out in program vault | VRF card shuffle |
| Bet/payout rules in open-source program | Commit–reveal hole cards |
| Room/player state & tx history on Solscan | Trustless demo/chip tables |

## Security

- Hole cards on-chain are visible to sophisticated readers — commit–reveal on roadmap.
- Slot-based shuffle is devnet-grade; VRF planned before mainnet casino-grade claims.
- Third-party audit required before mainnet.

## License

MIT
