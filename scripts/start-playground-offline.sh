#!/usr/bin/env bash
# Start Playground in offline mode as a background process
# Usage: ./scripts/start-playground-offline.sh

set -e

PORT="${PLAYGROUND_PORT:-9400}"
LOG_FILE="${PLAYGROUND_LOG:-playground-offline.log}"
PID_FILE=".playground-offline.pid"

echo "🎮 Starting WordPress Playground (Offline Mode)"
echo "=============================================="

# Check if already running
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "⚠️  Playground is already running (PID: $OLD_PID)"
        echo "   Use './scripts/stop-playground-offline.sh' to stop it first"
        exit 1
    else
        echo "🧹 Cleaning up stale PID file"
        rm "$PID_FILE"
    fi
fi

# Check if port is in use
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "❌ Port $PORT is already in use"
    echo "   Stop the process using: lsof -ti :$PORT | xargs kill"
    exit 1
fi

# Check if cache exists
if [ ! -d "test-harness/playground-cache/wordpress" ]; then
    echo "❌ WordPress cache not found"
    echo "   Run 'pnpm playground:setup' first"
    exit 1
fi

echo "📂 Using cached WordPress from: test-harness/playground-cache/wordpress"
echo "📝 Logging to: $LOG_FILE"
echo ""

# Start playground in background
wp-playground-cli server \
  --mount-before-install=./test-harness/playground-cache/wordpress:/wordpress \
  --mount=./app/showcase:/wordpress/wp-content/plugins/showcase-plugin \
  --blueprint=./test-harness/playground/blueprint-offline.json \
  --port=$PORT \
  > "$LOG_FILE" 2>&1 &

PLAYGROUND_PID=$!
echo $PLAYGROUND_PID > "$PID_FILE"

echo "🚀 Playground starting in background (PID: $PLAYGROUND_PID)"
echo "⏳ Waiting for Playground to be ready..."

# Wait for playground to respond (max 60 seconds)
MAX_WAIT=60
WAITED=0
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT 2>&1 | grep -qE "200|302"; then
        echo ""
        echo "✅ Playground is ready!"
        echo "   URL: http://127.0.0.1:$PORT"
        echo "   PID: $PLAYGROUND_PID"
        echo "   Log: $LOG_FILE"
        echo ""
        echo "To stop: ./scripts/stop-playground-offline.sh"
        exit 0
    fi
    
    # Check if process died
    if ! ps -p $PLAYGROUND_PID > /dev/null 2>&1; then
        echo ""
        echo "❌ Playground process died!"
        echo "   Check logs: cat $LOG_FILE"
        rm "$PID_FILE"
        exit 1
    fi
    
    sleep 2
    WAITED=$((WAITED + 2))
    echo -n "."
done

echo ""
echo "⚠️  Timeout waiting for Playground to start"
echo "   It may still be starting - check: cat $LOG_FILE"
echo "   PID: $PLAYGROUND_PID (saved in $PID_FILE)"
exit 1
