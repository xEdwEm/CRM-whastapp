#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if [ ! -f .env ]; then
  echo '.env not found in project directory' >&2
  exit 1
fi

set -a
. ./.env
set +a

npm install
sh ./scripts/build.sh
pm2 start ecosystem.config.js --env production
pm2 save
