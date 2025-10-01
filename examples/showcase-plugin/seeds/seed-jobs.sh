#!/bin/bash
# Seed job postings via REST API
# Idempotent: safe to run multiple times
# Note: In Sprint 1, we use static data. This script is a placeholder for Sprint 3.

set -e

echo "📋 Seeding job postings..."

# Check if WP Kernel Showcase plugin is active
if ! wp plugin is-active wp-kernel-showcase 2>/dev/null; then
	echo "  ⚠️  WP Kernel Showcase plugin not active. Activating..."
	wp plugin activate wp-kernel-showcase
fi

# Note: In Sprint 1, job postings are returned as static data from the REST controller.
# The GET /wpk/v1/jobs endpoint returns 5 hardcoded sample jobs.
# This seed script will be implemented in Sprint 3 when we add database persistence.

echo "  ℹ️  Job postings are currently static data (Sprint 1)"
echo "  ℹ️  Available via GET /wpk/v1/jobs (returns 5 sample jobs)"
echo "  ℹ️  POST/PUT/DELETE endpoints return 501 Not Implemented"
echo "  ✅ Job postings available (static data)"
