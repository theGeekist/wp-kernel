#!/bin/bash
# Init script that runs after wp-env starts
# Checks if seeding is needed and runs it

set -e

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Check if this is the first run (no posts except "Hello World")
POST_COUNT=$(wp-env run tests-cli wp post list --post_type=post --format=count 2>/dev/null || echo "0")

if [ "$POST_COUNT" -le "1" ]; then
    echo "🌱 First run detected, seeding database..."
    bash "$SCRIPT_DIR/seed-all.sh"
else
    echo "✅ Database already seeded (found $POST_COUNT posts)"
    echo "   Run 'pnpm wp:seed:reset' to reset and re-seed"
fi
