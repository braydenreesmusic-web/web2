#!/usr/bin/env bash
set -euo pipefail

# Simple deployment smoke-test for the game endpoints
# Usage:
#   ENDPOINT=https://yourees.xyz USER_ID=<uuid> DEBUG_SECRET=<secret> ./scripts/deploy-check.sh

ENDPOINT=${ENDPOINT:-https://yourees.xyz}
USER_ID=${USER_ID:-}
DEBUG_SECRET=${DEBUG_SECRET:-}

if [[ -z "$USER_ID" || -z "$DEBUG_SECRET" ]]; then
  cat <<EOF
Usage: ENDPOINT=https://yourees.xyz USER_ID=<uuid> DEBUG_SECRET=<secret> $0

This script runs three checks against the deployment:
  1) OPTIONS preflight for /api/validate-move
  2) GET /api/game-events-debug with debug secret
  3) POST /api/validate-move (synthetic move)
EOF
  exit 2
fi

echo "Endpoint: $ENDPOINT"
echo "User: $USER_ID"

echo "\n1) OPTIONS preflight -> /api/validate-move"
curl -i -X OPTIONS "$ENDPOINT/api/validate-move" \
  -H "Origin: $ENDPOINT" \
  -H "Access-Control-Request-Method: POST" || true

echo "\n2) GET -> /api/game-events-debug (requires debug secret)"
curl -G "$ENDPOINT/api/game-events-debug" \
  --data-urlencode "user_id=$USER_ID" \
  --data-urlencode "limit=10" \
  -H "x-debug-secret: $DEBUG_SECRET" || true

echo "\n3) POST -> /api/validate-move (synthetic move)"
payload=$(cat <<JSON
{"idx":0,"player":"X","user_id":"$USER_ID","author":"deploy-check"}
JSON
)
curl -sS -w "\nHTTP_STATUS:%{http_code}\n" "$ENDPOINT/api/validate-move" \
  -H "Content-Type: application/json" \
  -H "x-debug-secret: $DEBUG_SECRET" \
  -d "$payload" || true

echo "\nDone. Inspect the outputs above for status codes and JSON responses."
