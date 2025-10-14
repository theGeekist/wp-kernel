#!/usr/bin/env bash
# Build a WordPress Playground snapshot that can be used offline
set -euo pipefail

WP_VERSION="${WP_VERSION:-6.7.4}"
PHP_VERSION="${PHP_VERSION:-8.2}"
BLUEPRINT_DIR="./test-harness/playground"
BLUEPRINT="${BLUEPRINT:-${BLUEPRINT_DIR}/blueprint-setup.json}"
OUTDIR=".playground"
OUTFILE="${OUTDIR}/wp-${WP_VERSION}-php-${PHP_VERSION}.snapshot.zip"

SEED_DIR=".cache/wp-core"
LOCAL_CORE_ZIP="${SEED_DIR}/wordpress-${WP_VERSION}.zip"
BUNDLED_CORE_ZIP_NAME="wp-core-${WP_VERSION}.zip"
BUNDLED_CORE_ZIP_PATH="${OUTDIR}/${BUNDLED_CORE_ZIP_NAME}"
PLUGIN_SLUG="sqlite-database-integration"
PLUGIN_SEED_DIR=".cache/wp-plugins"
PLUGIN_METADATA_URL="https://api.wordpress.org/plugins/info/1.2/?action=plugin_information&request%5Bslug%5D=${PLUGIN_SLUG}"
DEFAULT_PLUGIN_VERSION="2.2.12"
TMP_BP="${OUTDIR}/_tmp_blueprint.json"
LOCAL_PLUGIN_ZIP=""
PLUGIN_VERSION=""
PLUGIN_BUNDLED_NAME="${PLUGIN_SLUG}.zip"
PLUGIN_BLUEPRINT_PATH="${BLUEPRINT_DIR}/${PLUGIN_BUNDLED_NAME}"
PLUGIN_OUTDIR_PATH="${OUTDIR}/${PLUGIN_BUNDLED_NAME}"
UNPACK_DIR="${OUTDIR}/wp-unpacked"

echo "🚀 Building WordPress Playground Snapshot"
echo "=========================================="
echo "WP=${WP_VERSION}  PHP=${PHP_VERSION}"
echo "Blueprint: ${BLUEPRINT}"
echo

mkdir -p "${OUTDIR}" "${SEED_DIR}" "${PLUGIN_SEED_DIR}"

if [ -n "${SQLITE_PLUGIN_VERSION:-}" ]; then
  PLUGIN_VERSION="${SQLITE_PLUGIN_VERSION}"
  echo "📦 Using SQLite plugin version from SQLITE_PLUGIN_VERSION: ${PLUGIN_VERSION}"
else
  echo "🔎 Determining latest SQLite plugin version..."
  if PLUGIN_METADATA=$(curl -fsSL "${PLUGIN_METADATA_URL}" 2>/dev/null); then
    PLUGIN_VERSION=$(printf '%s' "${PLUGIN_METADATA}" | jq -r '.version' 2>/dev/null || printf '%s' "${DEFAULT_PLUGIN_VERSION}")
    if [ -z "${PLUGIN_VERSION}" ] || [ "${PLUGIN_VERSION}" = "null" ]; then
      PLUGIN_VERSION="${DEFAULT_PLUGIN_VERSION}"
    fi
    echo "✅ Latest SQLite plugin version: ${PLUGIN_VERSION}"
  else
    echo "⚠️ Could not fetch SQLite plugin metadata. Falling back to ${DEFAULT_PLUGIN_VERSION}"
    PLUGIN_VERSION="${DEFAULT_PLUGIN_VERSION}"
  fi
fi

LOCAL_PLUGIN_ZIP="${PLUGIN_SEED_DIR}/${PLUGIN_SLUG}-${PLUGIN_VERSION}.zip"
if [ ! -f "${LOCAL_PLUGIN_ZIP}" ]; then
  echo "🌐 Downloading SQLite plugin ${PLUGIN_VERSION}..."
  if ! curl -fsSL "https://downloads.wordpress.org/plugin/${PLUGIN_SLUG}.${PLUGIN_VERSION}.zip" -o "${LOCAL_PLUGIN_ZIP}"; then
    echo "❌ Failed to download SQLite plugin ${PLUGIN_VERSION}."
    exit 1
  fi
else
  echo "📦 Using cached SQLite plugin: ${LOCAL_PLUGIN_ZIP}"
fi

cp "${LOCAL_PLUGIN_ZIP}" "${PLUGIN_OUTDIR_PATH}" || {
  echo "❌ Failed to copy SQLite plugin to ${PLUGIN_OUTDIR_PATH}"
  exit 1
}
cp "${LOCAL_PLUGIN_ZIP}" "${PLUGIN_BLUEPRINT_PATH}" || {
  echo "❌ Failed to copy SQLite plugin to ${PLUGIN_BLUEPRINT_PATH}"
  exit 1
}

echo "🧪 DNS sanity:"
node -e 'require("dns").resolve4("api.wordpress.org",(e,a)=>{console.error("api.wordpress.org",e||a)})' || true
node -e 'require("dns").resolve4("downloads.wordpress.org",(e,a)=>{console.error("downloads.wordpress.org",e||a)})' || true
node -e 'require("dns").resolve4("wordpress.org",(e,a)=>{console.error("wordpress.org",e||a)})' || true
echo

# ──────────────────────────────────────────────────────────────────────────────
# Fallback plan:
# 1) If LOCAL_CORE_ZIP exists, force the blueprint to use it (no network).
# 2) If it doesn't exist and network is available, try to fetch it once.
# 3) If network is blocked, we still run the CLI but with the tracer to see the host.
# ──────────────────────────────────────────────────────────────────────────────

maybe_create_tmp_blueprint_pointing_to_local_zip () {
  # If the blueprint already declares wordPressFilesZip, leave it alone.
  if grep -q '"wordPressFilesZip"' "${BLUEPRINT}"; then
    echo "📝 Blueprint already defines wordPressFilesZip. Using as-is."
    cp "${BLUEPRINT}" "${TMP_BP}"
    return
  fi
  if [ -f "${LOCAL_CORE_ZIP}" ]; then
    echo "📦 Using local core zip: ${LOCAL_CORE_ZIP}"
    # Inject a minimal installWordPress step at the top that uses the local zip.
    # (Assumes blueprint is a JSON object with a 'steps' array.)
    jq --arg path "./${BUNDLED_CORE_ZIP_NAME}" '
      .steps |=
      ([{"step":"importWordPressFiles","wordPressFilesZip":{"resource":"bundled","path":$path}}] + .)
    ' "${BLUEPRINT}" > "${TMP_BP}"
  else
    echo "ℹ️ No local core zip found; will let Playground fetch normally."
    cp "${BLUEPRINT}" "${TMP_BP}"
  fi
}

# Try to fetch the core zip once if allowed and not present.
if [ ! -f "${LOCAL_CORE_ZIP}" ]; then
  echo "🔍 Looking for local core zip at ${LOCAL_CORE_ZIP} (not found)."
  echo "🌐 Trying to fetch it (best effort; ok to fail if network is blocked)…"
  set +e
  curl -fsSL "https://wordpress.org/wordpress-${WP_VERSION}.zip" -o "${LOCAL_CORE_ZIP}"
  CURL_STATUS=$?
  set -e
  if [ ${CURL_STATUS} -eq 0 ]; then
    echo "✅ Cached core zip at ${LOCAL_CORE_ZIP}"
  else
    echo "⚠️ Could not download core zip (likely blocked). Proceeding without local zip."
  fi
fi

maybe_create_tmp_blueprint_pointing_to_local_zip

if [ -f "${LOCAL_CORE_ZIP}" ]; then
  cp "${LOCAL_CORE_ZIP}" "${BUNDLED_CORE_ZIP_PATH}"
fi

echo
echo "🛰  Running wp-playground-cli (with network tracer and curl fetch polyfill)"
NODE_OPTIONS="--require $(pwd)/scripts/polyfill-curl-fetch.cjs" \
pnpm wp-playground-cli build-snapshot \
  --wp="https://wordpress.org/wordpress-${WP_VERSION}.zip" \
  --php="${PHP_VERSION}" \
  --blueprint-may-read-adjacent-files \
  --blueprint="${TMP_BP}" \
  --outfile="${OUTFILE}"

echo ""
echo "📦 Copying snapshot to blueprint directory..."
cp -f "${OUTFILE}" test-harness/playground/

echo
echo "🗂  Unpacking snapshot for runtime mount..."
rm -rf "${UNPACK_DIR}"
mkdir -p "${UNPACK_DIR}"
if unzip -oq "${OUTFILE}" -d "${UNPACK_DIR}" > /dev/null 2>&1; then
  UNZIP_STATUS=0
else
  UNZIP_STATUS=$?
fi
if [ ${UNZIP_STATUS:-0} -gt 1 ]; then
  echo "❌ Failed to unpack snapshot archive"
  exit 1
fi
if [ ! -d "${UNPACK_DIR}/wordpress" ]; then
  echo "❌ Unexpected snapshot layout. Expected wordpress/ directory inside ${UNPACK_DIR}"
  exit 1
fi

echo ""
echo "🎉 Snapshot built!"
echo "   File: .playground/wp-6.7.4-php-8.2.snapshot.zip"
echo "   Ready for offline use with: pnpm playground:offline"
echo ""
