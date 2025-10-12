#!/usr/bin/env bash
# Offline Playground Setup Script
# This script pre-downloads WordPress and required assets for wp-playground-cli
# to avoid network fetches during CI/Docker runs.

set -e

# Configuration
WP_VERSION="${WP_VERSION:-6.7.4}"
PHP_VERSION="${PHP_VERSION:-8.3}"
CACHE_DIR="${CACHE_DIR:-./test-harness/playground-cache}"
WORDPRESS_ZIP="wordpress-${WP_VERSION}.zip"
WORDPRESS_URL="https://wordpress.org/wordpress-${WP_VERSION}.zip"

echo "🚀 Offline Playground Setup"
echo "================================"
echo "WordPress Version: ${WP_VERSION}"
echo "PHP Version: ${PHP_VERSION}"
echo "Cache Directory: ${CACHE_DIR}"
echo ""

# Create cache directory
mkdir -p "${CACHE_DIR}/wordpress"
mkdir -p "${CACHE_DIR}/builds"

# Download WordPress if not already cached
if [ ! -f "${CACHE_DIR}/${WORDPRESS_ZIP}" ]; then
    echo "📦 Downloading WordPress ${WP_VERSION}..."
    curl -L -o "${CACHE_DIR}/${WORDPRESS_ZIP}" "${WORDPRESS_URL}"
    echo "✅ WordPress downloaded"
else
    echo "✅ WordPress ${WP_VERSION} already cached"
fi

# Extract WordPress if not already extracted
if [ ! -d "${CACHE_DIR}/wordpress/wp-includes" ]; then
    echo "📂 Extracting WordPress..."
    unzip -q "${CACHE_DIR}/${WORDPRESS_ZIP}" -d "${CACHE_DIR}/tmp"
    mv "${CACHE_DIR}/tmp/wordpress"/* "${CACHE_DIR}/wordpress/"
    rm -rf "${CACHE_DIR}/tmp"
    echo "✅ WordPress extracted"
else
    echo "✅ WordPress already extracted"
fi

# Download SQLite integration plugin if needed
SQLITE_PLUGIN_URL="https://downloads.wordpress.org/plugin/sqlite-database-integration.2.1.15.zip"
SQLITE_PLUGIN_DIR="${CACHE_DIR}/wordpress/wp-content/plugins/sqlite-database-integration"

if [ ! -d "${SQLITE_PLUGIN_DIR}" ]; then
    echo "📦 Downloading SQLite integration plugin..."
    curl -L -o "${CACHE_DIR}/sqlite-plugin.zip" "${SQLITE_PLUGIN_URL}"
    mkdir -p "${CACHE_DIR}/wordpress/wp-content/plugins"
    unzip -q "${CACHE_DIR}/sqlite-plugin.zip" -d "${CACHE_DIR}/wordpress/wp-content/plugins"
    rm "${CACHE_DIR}/sqlite-plugin.zip"
    echo "✅ SQLite plugin installed"
else
    echo "✅ SQLite plugin already installed"
fi

echo ""
echo "🎉 Offline setup complete!"
echo ""
echo "📝 Strategy: We have two options for offline Playground:"
echo ""
echo "   Option 1: Use cached files (recommended for CI)"
echo "   - Playground will use cached WordPress but still run installation"
echo "   - No WordPress download, but SQLite/install steps still run"
echo "   - Command: wp-playground-cli without --skip-wordpress-setup"
echo ""
echo "   Option 2: Build a complete snapshot (true offline)"
echo "   - Build a fully-installed WordPress ZIP with your plugin"
echo "   - Requires building online first, then offline forever"
echo "   - Command: See PLAYGROUND_OFFLINE_SETUP.md"
echo ""
echo "Current playground:offline uses Option 1 (partial offline)"
echo ""
