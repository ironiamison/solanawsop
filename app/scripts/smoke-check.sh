#!/usr/bin/env bash
# Quick smoke check — run with dev server on PORT (default 3001)
set -euo pipefail
BASE="${1:-http://localhost:3001}"
ROUTES="/ /demo /profile /leaderboard /terms /privacy /loading /api/flywheel/stats /api/rewards/redeem"

echo "Smoke check → $BASE"
for path in $ROUTES; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path" || echo "000")
  if [[ "$code" =~ ^[23] ]]; then
    echo "  ✓ $path ($code)"
  else
    echo "  ✗ $path ($code)"
    exit 1
  fi
done
echo "All routes OK"
