#!/usr/bin/env bash
# Build and deploy the Solana poker program to devnet/mainnet.
# Requires: Solana CLI, Anchor 0.31+, cargo-build-sbf
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

NETWORK="${1:-devnet}"
echo "→ Solana network: $NETWORK"
solana config set --url "$NETWORK"

echo "→ Building program…"
anchor build

echo "→ Deploying…"
anchor deploy

PROGRAM_ID="$(solana address -k target/deploy/solana_poker-keypair.json)"
echo ""
echo "Deployed program id: $PROGRAM_ID"
echo ""
echo "Update these if the id changed:"
echo "  programs/solana_poker/src/lib.rs  (declare_id!)"
echo "  Anchor.toml"
echo "  app/src/lib/constants.ts"
echo "  app/src/idl/solana_poker.json"
echo ""
echo "Then in app/.env.local:"
echo "  NEXT_PUBLIC_PRIVATE_TABLES_ENABLED=true"
echo ""
echo "Initialize public rooms from the lobby (connect wallet → Initialize tables)."
