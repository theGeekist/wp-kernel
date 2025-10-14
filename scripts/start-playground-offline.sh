#!/usr/bin/env bash
# Start Playground in offline mode using snapshot
set -euo pipefail

PORT="${PLAYGROUND_PORT:-9400}"
LOG_FILE="${PLAYGROUND_LOG:-playground-offline.log}"
PID_FILE=".playground-offline.pid"
WORDPRESS_DIR="$(pwd)/.playground/wp-unpacked/wordpress"
EXAMPLES_DIR="$(pwd)/examples"
OFFLINE_BLUEPRINT="./test-harness/playground/blueprint-offline.json"
SQLITE_PLUGIN_ZIP="./test-harness/playground/sqlite-database-integration.zip"

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

if [[ ! -d "${WORDPRESS_DIR}" ]]; then
  echo "❌ Unpacked WordPress directory missing at ${WORDPRESS_DIR}"
  echo "   Re-run 'pnpm playground:setup'"
  exit 1
fi

if [[ ! -f "${SQLITE_PLUGIN_ZIP}" ]]; then
  echo "❌ SQLite plugin bundle missing at ${SQLITE_PLUGIN_ZIP}"
  echo "   Re-run 'pnpm playground:setup'"
  exit 1
fi

if [[ ! -f "${OFFLINE_BLUEPRINT}" ]]; then
  echo "❌ Offline blueprint missing"
  exit 1
fi

# Discover plugins under examples/* and build mounts
MOUNTS=()
PLUGIN_COUNT=0

if [[ -d "${EXAMPLES_DIR}" ]]; then
  while IFS= read -r -d '' candidate; do
    # Sanity check: must contain a PHP file with a WordPress plugin header (Plugin Name:)
    if grep -RIlE '^[[:space:]]*\*?[[:space:]]*Plugin Name[[:space:]]*:' --include='*.php' "$candidate" >/dev/null 2>&1; then
      plugin_slug="$(basename "$candidate")"
      MOUNTS+=(--mount "$candidate:/wordpress/wp-content/plugins/${plugin_slug}")
      (( PLUGIN_COUNT++ ))
    fi
  done < <(find "${EXAMPLES_DIR}" -mindepth 1 -maxdepth 1 -type d -print0)
else
  echo "ℹ️  Examples directory not found: ${EXAMPLES_DIR}"
fi

if (( PLUGIN_COUNT == 0 )); then
  echo "⚠️  No valid plugins discovered under ${EXAMPLES_DIR} (looked for 'Plugin Name:' in *.php)."
else
  echo "🔎 Discovered ${PLUGIN_COUNT} plugin(s) in ${EXAMPLES_DIR}:"
  for (( i=0; i<${#MOUNTS[@]}; i+=2 )); do
    # Each mount pair is: --mount "host:container"; extract the host path from the next element
    host_path="${MOUNTS[i+1]}"
    echo "   • ${host_path%%:*} -> ${host_path#*:}"
  done
fi

echo "📝 Logging to: $LOG_FILE"

# Start in background - mount is in blueprint now
NODE_OPTIONS="--require $(pwd)/scripts/polyfill-curl-fetch.cjs" \
PLAYGROUND_URL="" pnpm wp-playground-cli server \
  --blueprint="${OFFLINE_BLUEPRINT}" \
  --blueprint-may-read-adjacent-files \
  --skip-wordpress-setup \
  --mount-before-install="${WORDPRESS_DIR}:/wordpress" \
  ${MOUNTS[@]} \
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
  http_status=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/wp-json/" || echo "000")
  if [[ "$http_status" == "200" || "$http_status" == "302" ]]; then
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
