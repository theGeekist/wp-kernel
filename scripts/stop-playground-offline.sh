#!/usr/bin/env bash
# Stop the offline Playground server
set -euo pipefail

PID_FILE=".playground-offline.pid"

if [[ -f "$PID_FILE" ]]; then
  pgid="$(cat "$PID_FILE")"
  kill "$pgid" 2>/dev/null || true
  rm -f "$PID_FILE"
  echo "⏹  Playground stopped (PID: $pgid)"
else
  echo "No PID file found; nothing to stop."
fi
