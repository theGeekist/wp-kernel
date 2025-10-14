#!/usr/bin/env bash
# Build a complete, pre-installed WordPress Playground snapshot
# This creates a fully-configured WordPress instance that can run truly offline

set -e

echo "🏗️  Building Playground Snapshot"
echo "================================"
echo ""

# Configuration
SNAPSHOT_DIR="./test-harness/playground-snapshots"
SNAPSHOT_FILE="${SNAPSHOT_DIR}/wordpress-showcase.zip"
TEMP_DIR="${SNAPSHOT_DIR}/temp"

# Clean up old snapshots
rm -rf "${SNAPSHOT_DIR}"
mkdir -p "${SNAPSHOT_DIR}"
mkdir -p "${TEMP_DIR}"

echo "📦 Step 1: Building showcase plugin..."
pnpm --filter wp-kernel-showcase build

echo ""
echo "🎮 Step 2: Starting temporary online Playground to build snapshot..."
echo "   (This requires network access for initial setup)"
echo ""

# Start playground in background, let it fully initialize
wp-playground-cli server \
  --blueprint=./test-harness/playground/blueprint.json \
  --mount=./examples/showcase:/wordpress/wp-content/plugins/showcase-plugin \
  --port=9401 &

PLAYGROUND_PID=$!

# Wait for playground to fully boot
echo "⏳ Waiting for Playground to boot (60 seconds)..."
sleep 60

# Check if playground is running
if ! ps -p $PLAYGROUND_PID > /dev/null; then
    echo "❌ Playground failed to start"
    exit 1
fi

echo "✅ Playground is running"
echo ""

# Give it extra time to ensure full initialization
sleep 10

echo "📸 Step 3: Building snapshot from running Playground..."

# Stop the playground gracefully
kill -TERM $PLAYGROUND_PID 2>/dev/null || true
wait $PLAYGROUND_PID 2>/dev/null || true

echo ""
echo "🔨 Step 4: Creating snapshot archive..."

# Use the build-snapshot command instead
wp-playground-cli build-snapshot \
  --blueprint=./test-harness/playground/blueprint.json \
  --mount=./examples/showcase:/wordpress/wp-content/plugins/showcase-plugin \
  --outfile="${SNAPSHOT_FILE}"

if [ -f "${SNAPSHOT_FILE}" ]; then
    SNAPSHOT_SIZE=$(du -h "${SNAPSHOT_FILE}" | cut -f1)
    echo ""
    echo "🎉 Snapshot created successfully!"
    echo "   File: ${SNAPSHOT_FILE}"
    echo "   Size: ${SNAPSHOT_SIZE}"
    echo ""
    echo "To use the snapshot:"
    echo "   pnpm playground:from-snapshot"
    echo ""
else
    echo "❌ Failed to create snapshot"
    exit 1
fi

# Clean up
rm -rf "${TEMP_DIR}"

echo "✅ Done!"
