#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR/.."

if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

for var in NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY; do
  if [ -z "$(eval "echo \"\${$var}\"")" ]; then
    echo "Missing required env var: $var" >&2
    exit 1
  fi
done

npm run build
