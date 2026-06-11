# $SWSOP token launch checklist

Real-money public cash games use **SPL escrow** in the Anchor program. Demo, bot practice, and profile private chip tables stay off-chain until you point them at the same mint.

## 1. Deploy token on pump.fun

Launch `$SWSOP` and copy the **mint address** (base58).

## 2. Redeploy the poker program

The program must include SPL vault support (see `programs/solana_poker`).

```bash
./scripts/deploy-program.sh devnet   # or mainnet-beta
```

## 3. Set environment variables

**Vercel / `.env.local` / Fly:**

```bash
NEXT_PUBLIC_TOKEN_SYMBOL=$SWSOP
NEXT_PUBLIC_SWSOP_MINT=<your-pump-fun-mint-pubkey>
```

Redeploy the Next.js app after setting the mint.

## 4. One-time on-chain setup (authority wallet)

1. Open the lobby while connected with the deployer/authority wallet.
2. Click **Initialize tables**.

This runs `setupAllRooms`, which:

- Creates `GlobalConfig` if missing
- Calls `configure_mint` with your pump.fun mint (one-time)
- Creates the fee-recipient token ATA (for private-table rake)
- Creates 5 public tier rooms, each with a **vault token ATA** (PDA-owned)

## 5. How escrow works

| Action | On-chain |
|--------|----------|
| **Join table** | `token::transfer` — buy-in from your ATA → room vault ATA |
| **Bet / pot** | Ledger in program state (stack / pot) |
| **Win hand** | Stack credited on-chain; tokens stay in vault |
| **Leave table** | `token::transfer` — stack from vault ATA → your ATA |
| **Private rake** | 10% of pot transferred vault → authority ATA |

Verify every join/leave on Solscan: amounts, mint, and program ID `2EjVHs2eD6fHAh7vjKMff6zuGRM8NnbKGrJqtmnLfPc7`.

## 6. Buy-in tiers (6 decimals)

| Tier | Buy-in |
|------|--------|
| 0 | 50K $SWSOP |
| 1 | 100K $SWSOP |
| 2 | 250K $SWSOP |
| 3 | 500K $SWSOP |
| 4 | 1M $SWSOP |

Players need the buy-in amount in their wallet ATA before **Take a seat**.

## 7. Fairness documentation

Publish **[FAIRNESS.md](./FAIRNESS.md)** with your launch. The app exposes:

- `/fairness` — player-facing trust guide
- Table **Verify on-chain** panel — program ID, room account, deal seed, Solscan links

Do **not** claim full provably-fair dealing until VRF + commit–reveal ship.

## 8. Before mainnet

- Audit the program
- VRF shuffle (replace slot-based seed)
- Commit–reveal hole cards
- Immutable program or multisig upgrade authority
