# Fairness, verification & trust

SolanaWSOP separates **money you can verify on-chain** from **play modes that are not fully provable**. This document is the source of truth.

## Quick reference

| Mode | Route | Escrow | Provably fair deal? | Verify on Solscan |
|------|-------|--------|---------------------|-------------------|
| **Public cash games** | `/table/{room}` | Real `$SWSOP` SPL in program vault | **Partial** — VRF shuffle + commit–reveal holes | Yes |
| **Demo** | `/demo` | None (free chips) | No | No |
| **Profile private / practice** | `/wsop-table`, `/profile/practice` | Play chips (server) | No | No |
| **SOL/SPL private (on-chain)** | `/table/{private}` | SPL vault + optional rake | **Partial** — same as cash | Yes |

Program ID (verify this address in your wallet before signing):

```
2EjVHs2eD6fHAh7vjKMff6zuGRM8NnbKGrJqtmnLfPc7
```

---

## What is verifiable on-chain today (cash games)

### 1. Escrow (cannot be faked by the website)

- **Join** — SPL tokens move from your wallet ATA → room **vault token account** (PDA-owned).
- **Stack & pot** — Updated only by program instructions, not the web server.
- **Leave** — Vault pays your stack back to your wallet ATA (signed by vault PDA).
- **Private rake** — 10% of pot can transfer vault → authority ATA (on-chain, visible).

### 2. Betting rules (deterministic program logic)

- Bets, raises, folds, and showdown payouts follow open-source Rust in `programs/solana_poker`.
- Side pots and hand ranking use the same `hand_eval` module for all players.

### 3. VRF-style shuffle (SlotHashes)

Each `start_hand`:

1. Reads the **SlotHashes** sysvar (recent block hashes).
2. Mixes room key, hand number, buy-in, and optional player **entropy commitments**.
3. Derives `vrf_seed` (32 bytes) → `game_seed` → deterministic `shuffle_deck`.
4. Stores **`deck_commitment`** = SHA-256(deck ‖ vrf_seed) on the Room and `HandState` PDA.

This is stronger than the old `slot × hand_number` formula. It is **not** Switchboard VRF — validators still see SlotHashes before the tx lands. Switchboard is on the roadmap for mainnet-grade claims.

**Verify:** `app/src/lib/fairness/shuffle.ts` + `commit.ts` match `game_logic.rs`.

### 4. Commit–reveal hole cards

During an active hand:

- Player accounts show **`hole_cards = [255, 255]`** and **SHA-256 commitments** only.
- Actual cards live in the per-hand **`HandState` PDA** (`hole_by_seat`) until showdown.
- `HoleCardsDealt` events in the `start_hand` transaction deliver cards to clients.
- Optional `reveal_hole_cards` writes verified cards to your Player PDA.
- At showdown, winners’ cards are revealed on-chain for payout verification.
- `reveal_deck` verifies the full deck against `deck_commitment`.

**Honest limit:** `HandState` account data is public on RPC. A sophisticated reader could fetch it before showdown. Commit–reveal stops casual table scraping via Player PDAs and proves the deck was fixed at deal time.

### 5. Optional player entropy

`commit_hand_entropy` lets you submit `SHA-256(secret)` while the table is waiting. The secret is mixed into `vrf_seed` at the next deal (then cleared).

---

## What is NOT fully provable yet

| Claim | Status |
|-------|--------|
| “The server can’t steal my buy-in” | **True** (SPL vault PDA) |
| “Payout math is public” | **True** |
| “Nobody could read my cards before showdown” | **Not fully** (HandState PDA is public to RPC) |
| “Shuffle is oracle-grade VRF” | **Not yet** (SlotHashes, not Switchboard) |
| “Demo is trustless” | **False** (server chips) |

---

## How to verify a hand (cash game)

1. Note the **room address** and **hand number** (Verify panel / Solscan).
2. Find the **`start_hand`** transaction — event `HandDealt` includes `deck_commitment` and `vrf_seed`.
3. Recompute shuffle with `deckFromOnChainSeed(gameSeed, slot)` and check `deckCommitment()` in `app/src/lib/fairness/commit.ts`.
4. Compare **hole commitments** on Player PDAs to `holeCardCommitment()` for your seat.
5. After the hand, call or inspect **`reveal_deck`** and confirm the deck matches the commitment.

In-app: **[/fairness](/fairness)** and the table **Verify** card.

---

## Roadmap

1. **Switchboard VRF** — replace SlotHashes mix for mainnet
2. **Encrypt or ZK hole cards** — hide HandState from casual RPC readers
3. **Third-party audit** before mainnet launch
4. **Immutable program** or published multisig upgrade authority

---

## For developers

- Shuffle: `programs/solana_poker/src/game_logic.rs` ↔ `app/src/lib/fairness/shuffle.ts`
- Commitments: `app/src/lib/fairness/commit.ts`
- Events: `HoleCardsDealt`, `HandDealt` in `lib.rs`
- Launch: [SWSOP_LAUNCH.md](./SWSOP_LAUNCH.md)
