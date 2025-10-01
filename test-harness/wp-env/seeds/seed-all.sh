#!/bin/bash
# Master seed script - runs all seeds in correct order
# Idempotent: safe to run multiple times

set -e

echo "🌱 Starting database seeding..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Ensure permalinks are configured (needed for REST API)
echo "⚙️  Configuring permalinks..."
wp rewrite structure '/%postname%/' --hard --quiet
echo "✅ Permalinks configured"
echo ""

# Run seeds in order
bash "$SCRIPT_DIR/seed-users.sh"
bash "$SCRIPT_DIR/seed-content.sh"
bash "$SCRIPT_DIR/seed-applications.sh"
bash "$SCRIPT_DIR/seed-media.sh"

# Run showcase plugin seeds
PLUGIN_SEEDS_DIR="$SCRIPT_DIR/../../../examples/showcase-plugin/seeds"
if [ -f "$PLUGIN_SEEDS_DIR/seed-jobs.sh" ]; then
	bash "$PLUGIN_SEEDS_DIR/seed-jobs.sh"
fi

echo "🎉 All seeding complete!"
echo ""
echo "═══════════════════════════════════════════════"
echo "Test Data Summary"
echo "═══════════════════════════════════════════════"
echo ""
echo "👥 Users (5):"
echo "  • admin / password (administrator)"
echo "  • hiring_manager / password (editor)"
echo "  • job_seeker / password (subscriber)"
echo "  • employer / password (author)"
echo "  • developer / password (administrator)"
echo ""
echo "📄 Jobs (5):"
echo "  • Senior WordPress Developer"
echo "  • Frontend Engineer (React)"
echo "  • DevOps Engineer"
echo "  • Full Stack Developer"
echo "  • Technical Writer"
echo ""
echo "📋 Applications (10):"
echo "  • 2 Pending Review"
echo "  • 3 Reviewing"
echo "  • 2 Shortlisted"
echo "  • 2 Interview Scheduled"
echo "  • 1 Rejected"
echo ""
echo "📎 Media:"
echo "  • Sample CV (sample-cv.pdf)"
echo "  • 3 Profile image placeholders"
echo ""
echo "═══════════════════════════════════════════════"
echo ""
echo "🚀 Your test environment is ready!"
echo "   Visit: http://localhost:8888/wp-admin/"
echo ""
