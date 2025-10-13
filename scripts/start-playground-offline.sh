#!/usr/bin/env bash
# Start Playground in offline mode using snapshot
set -euo pipefail

PORT="${PLAYGROUND_PORT:-9400}"
LOG_FILE="${PLAYGROUND_LOG:-playground-offline.log}"
PID_FILE=".playground-offline.pid"

echo "🎮 Starting WordPress Playground (Offline Mode)"
echo "=============================================="

# Check if already running
if [[ -f "$PID_FILE" ]]; then
  old_pid="$(cat "$PID_FILE")"
  if ps -p "$old_pid" >/dev/null 2>&1; then
    echo "⚠️  Already running (PID: $old_pid)"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

# Must have the snapshot
if [[ ! -f .playground/wp-6.7.4-php-8.2.snapshot.zip ]]; then
  echo "❌ Snapshot ZIP missing - run 'pnpm playground:setup' first"
  exit 1
fi

if [[ ! -f ./test-harness/playground/blueprint-offline.json ]]; then
  echo "❌ Offline blueprint missing"
  exit 1
fi

echo "📝 Logging to: $LOG_FILE"

# Start in background - mount is in blueprint now
PLAYGROUND_URL="" pnpm wp-playground-cli server \
  --blueprint=./test-harness/playground/blueprint-offline.json \
  --blueprint-may-read-adjacent-files \
  --port="$PORT" \
  --verbosity=normal > "$LOG_FILE" 2>&1 &

pgid=$!
echo "$pgid" > "$PID_FILE"

echo "🚀 Playground starting (PGID: $pgid)"
echo -n "⏳ Waiting for REST API"

# Health check
max=60
waited=0
while (( waited < max )); do
  if curl -fsS "http://127.0.0.1:$PORT/wp-json/" 2>/dev/null | grep -q '"name"'; then
    echo ""
    echo "✅ Ready at http://127.0.0.1:$PORT"
    echo "   PID: $pgid"
    echo "   Log: $LOG_FILE"
    echo ""
    echo "To stop: ./scripts/stop-playground-offline.sh"
    exit 0
  fi
  
  if ! ps -p "$pgid" >/dev/null 2>&1; then
    echo ""
    echo "❌ Died early (see $LOG_FILE)"
    cat "$LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
  fi
  
  sleep 2
  waited=$((waited+2))
  echo -n "."
done

echo ""
echo "⚠️  Timeout (see $LOG_FILE)"
cat "$LOG_FILE"
exit 1
