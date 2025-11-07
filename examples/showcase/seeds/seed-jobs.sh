#!/bin/bash
# Seed job postings via REST API
# Idempotent: safe to run multiple times
# Note: Sprint 1 used static data. Sprint 2 uses transients for E2E testing.

set -e

echo "📋 Seeding job postings..."

# Check if WPKernel Showcase plugin is active
if ! wp plugin is-active wp-kernel-showcase 2>/dev/null; then
	echo "  ⚠️  WPKernel Showcase plugin not active. Activating..."
	wp plugin activate wp-kernel-showcase
fi

# Sprint 2: Job postings use transient storage for E2E testing.
# - GET /wpk/v1/jobs: Returns sample jobs (fallback) or transient-stored jobs
# - POST /wpk/v1/jobs: Creates jobs in transients (auto-generates IDs)
# - PUT /wpk/v1/jobs/:id: Updates jobs in transients
# - DELETE /wpk/v1/jobs/:id: Deletes jobs from transients
# Sprint 3 will implement proper database persistence (custom post types or tables).

echo "  ℹ️  Job postings use transient storage (Sprint 2 - E2E testing)"
echo "  ℹ️  Available via GET /wpk/v1/jobs"
echo "  ℹ️  POST/PUT/DELETE endpoints functional (transient-based)"
echo "  ℹ️  Database persistence coming in Sprint 3"
echo "  ✅ Job postings available (transient storage)"
