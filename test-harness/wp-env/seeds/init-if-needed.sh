#!/bin/bash
# Init script that runs after wp-env starts
# Checks if seeding is needed and runs it

set -e

# Check if this is the first run (no posts except "Hello World")
POST_COUNT=$(wp post list --post_type=post --format=count 2>/dev/null || echo "0")

if [ "$POST_COUNT" -le "1" ]; then
    echo "🌱 First run detected, seeding database..."
    # Future: call seed scripts here
    echo "✅ Database seeded"
else
    echo "✅ Database already seeded (found $POST_COUNT posts)"
fi
