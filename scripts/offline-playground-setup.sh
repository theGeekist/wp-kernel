#!/usr/bin/env bash
# Build a WordPress snapshot that can be used offline
set -e

echo "🚀 Building WordPress Playground Snapshot"
echo "=========================================="

mkdir -p .playground

pnpm wp-playground-cli build-snapshot \
  --wp=6.7.4 \
  --php=8.2 \
  --blueprint=./test-harness/playground/blueprint-setup.json \
  --mount="$(pwd)/app/showcase:/wordpress/wp-content/plugins/showcase-plugin" \
  --outfile=.playground/wp-6.7.4-php-8.2.snapshot.zip

echo ""
echo "📦 Copying snapshot to blueprint directory..."
cp .playground/wp-6.7.4-php-8.2.snapshot.zip test-harness/playground/

echo ""
echo "🎉 Snapshot built!"
echo "   File: .playground/wp-6.7.4-php-8.2.snapshot.zip"
echo "   Ready for offline use with: pnpm playground:offline"
echo ""
