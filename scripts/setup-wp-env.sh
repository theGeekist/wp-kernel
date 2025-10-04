#!/usr/bin/env bash
#
# Setup script for wp-env
# Configures WordPress for E2E testing (permalinks, etc.)
#

set -e

echo "🔧 Configuring wp-env for E2E tests..."

# Set pretty permalinks structure
echo "  → Setting permalink structure..."
wp-env run tests-cli wp rewrite structure '/%postname%/' --hard

# Flush rewrite rules to ensure REST API works
echo "  → Flushing rewrite rules..."
wp-env run tests-cli wp rewrite flush --hard

# Verify REST API is accessible
echo "  → Verifying REST API..."
HTTP_CODE=$(wp-env run tests-cli wp eval 'echo wp_remote_retrieve_response_code(wp_remote_get(home_url("/wp-json/")));')

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ wp-env configured successfully! REST API is accessible."
else
    echo "⚠️  Warning: REST API returned HTTP $HTTP_CODE"
    echo "   Tests may fail. Try running: pnpm wp:restart"
fi
