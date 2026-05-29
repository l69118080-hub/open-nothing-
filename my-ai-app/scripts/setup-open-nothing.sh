#!/usr/bin/env sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)

cd "$ROOT_DIR"
sh scripts/install-open-nothing.sh
open-nothing setup

echo ""
echo "Setup complete."
echo "Start the dashboard with:"
echo "open-nothing dashboard"
