#!/usr/bin/env bash
# Test script to verify offline playground works without network access
# WARNING: This script temporarily disables network interfaces!

set -e

echo "🧪 Testing Offline Playground Setup"
echo "====================================="
echo ""

# Check if setup was run
if [ ! -d "test-harness/playground-cache/wordpress" ]; then
    echo "❌ WordPress cache not found. Run 'pnpm playground:setup' first."
    exit 1
fi

echo "✅ WordPress cache found"
echo ""

# Ask for confirmation before disabling network
read -p "This test will temporarily disable network. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Test cancelled"
    exit 0
fi

# Detect network interface (macOS vs Linux)
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    INTERFACE=$(route get default 2>/dev/null | grep interface | awk '{print $2}')
    DISABLE_CMD="sudo ifconfig $INTERFACE down"
    ENABLE_CMD="sudo ifconfig $INTERFACE up"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    INTERFACE=$(ip route | grep default | awk '{print $5}' | head -1)
    DISABLE_CMD="sudo ip link set $INTERFACE down"
    ENABLE_CMD="sudo ip link set $INTERFACE up"
else
    echo "❌ Unsupported OS: $OSTYPE"
    exit 1
fi

if [ -z "$INTERFACE" ]; then
    echo "❌ Could not detect network interface"
    exit 1
fi

echo "🔌 Using network interface: $INTERFACE"
echo ""

# Function to re-enable network (cleanup)
cleanup() {
    echo ""
    echo "🔄 Re-enabling network..."
    eval $ENABLE_CMD
    sleep 2
    echo "✅ Network restored"
}

# Set trap to ensure network is restored even if script fails
trap cleanup EXIT INT TERM

# Disable network
echo "🚫 Disabling network..."
eval $DISABLE_CMD
sleep 2

# Verify network is down
if ping -c 1 -t 1 8.8.8.8 &>/dev/null; then
    echo "❌ Network still appears to be active"
    exit 1
fi

echo "✅ Network disabled"
echo ""

# Try to start playground offline
echo "🎮 Starting playground in offline mode..."
echo ""

# Start playground in background
pnpm playground:offline &
PLAYGROUND_PID=$!

# Wait for playground to start
echo "⏳ Waiting for playground to start (30 seconds)..."
sleep 30

# Check if playground is still running
if ! ps -p $PLAYGROUND_PID > /dev/null; then
    echo "❌ Playground failed to start"
    exit 1
fi

# Try to access playground
echo "🌐 Testing playground accessibility..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:9400 2>&1 || echo "000")

if [ "$HTTP_CODE" == "000" ]; then
    echo "❌ Could not connect to playground"
    kill $PLAYGROUND_PID 2>/dev/null || true
    exit 1
elif [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "302" ]; then
    echo "✅ Playground is accessible (HTTP $HTTP_CODE)"
else
    echo "⚠️  Playground responded with HTTP $HTTP_CODE"
fi

# Stop playground
echo ""
echo "🛑 Stopping playground..."
kill $PLAYGROUND_PID 2>/dev/null || true
sleep 2

echo ""
echo "🎉 Offline playground test PASSED!"
echo ""
echo "Summary:"
echo "  ✅ WordPress cache exists"
echo "  ✅ Playground started without network"
echo "  ✅ Playground is accessible"
echo ""
