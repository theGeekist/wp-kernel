#!/usr/bin/env bash
# Stop the background Playground process
# Usage: ./scripts/stop-playground-offline.sh

set -e

PID_FILE=".playground-offline.pid"
PORT="${PLAYGROUND_PORT:-9400}"

echo "🛑 Stopping WordPress Playground"
echo "================================"

if [ ! -f "$PID_FILE" ]; then
    echo "⚠️  No PID file found ($PID_FILE)"
    
    # Try to find and kill by port
    if lsof -ti :$PORT >/dev/null 2>&1; then
        echo "🔍 Found process on port $PORT, killing..."
        lsof -ti :$PORT | xargs kill -TERM 2>/dev/null || true
        sleep 2
        
        # Force kill if still running
        if lsof -ti :$PORT >/dev/null 2>&1; then
            echo "⚠️  Process still running, force killing..."
            lsof -ti :$PORT | xargs kill -9 2>/dev/null || true
        fi
        echo "✅ Stopped process on port $PORT"
    else
        echo "✅ Playground is not running"
    fi
    exit 0
fi

PID=$(cat "$PID_FILE")

if ! ps -p "$PID" > /dev/null 2>&1; then
    echo "✅ Playground process (PID: $PID) is not running"
    rm "$PID_FILE"
    exit 0
fi

echo "🔪 Killing Playground process (PID: $PID)"
kill -TERM "$PID" 2>/dev/null || true
sleep 2

# Check if still running
if ps -p "$PID" > /dev/null 2>&1; then
    echo "⚠️  Process still running, force killing..."
    kill -9 "$PID" 2>/dev/null || true
    sleep 1
fi

if ps -p "$PID" > /dev/null 2>&1; then
    echo "❌ Failed to stop Playground"
    exit 1
else
    echo "✅ Playground stopped successfully"
    rm "$PID_FILE"
fi
