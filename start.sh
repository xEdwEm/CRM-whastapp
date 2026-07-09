#!/bin/sh
set -eu
HOSTNAME=${HOSTNAME:-0.0.0.0}
PORT=${PORT:-3000}
exec node node_modules/next/dist/bin/next start -H 0.0.0.0 -p "$PORT"
