#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export MC_RUNTIME_DISPATCHER_NAME="${MC_RUNTIME_DISPATCHER_NAME:-mc-runtime-dispatcher}"
export MC_RUNTIME_STALE_AFTER_MINUTES="${MC_RUNTIME_STALE_AFTER_MINUTES:-30}"

exec ./node_modules/.bin/tsx scripts/mission-control-runtime-dispatcher.ts
