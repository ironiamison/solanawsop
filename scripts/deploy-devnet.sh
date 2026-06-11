#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ Setting cluster to devnet"
solana config set --url devnet

echo "→ Building Anchor program"
anchor build

echo "→ Deploying to devnet"
anchor deploy

PROGRAM_ID=$(solana address -k target/deploy/solana_poker-keypair.json)
echo ""
echo "Deployed program: $PROGRAM_ID"
echo "Update declare_id!, Anchor.toml, app/src/lib/constants.ts, and app/src/idl/solana_poker.json if this changed."
