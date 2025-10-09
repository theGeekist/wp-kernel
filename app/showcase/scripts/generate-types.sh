#!/bin/bash
# Generate TypeScript types from JSON Schema files
# Usage: ./scripts/generate-types.sh

set -euo pipefail

echo "🔄 Generating TypeScript types from JSON Schema..."

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get the showcase directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHOWCASE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Ensure generated directories exist
mkdir -p "$SHOWCASE_DIR/.generated/types"

# Generate types for Job schema
echo "  📝 Generating Job types..."
pnpm exec json2ts \
  "$SHOWCASE_DIR/contracts/job.schema.json" \
  --output "$SHOWCASE_DIR/.generated/types/job.d.ts" \
  --bannerComment "/**
 * Auto-generated TypeScript types from job.schema.json
 * DO NOT EDIT MANUALLY - regenerate with: pnpm types:generate
 */" \
  --unknownAny false \
  --unreachableDefinitions false \
  --style.singleQuote

echo "  🎨 Formatting generated types..."
pnpm exec prettier --write "$SHOWCASE_DIR/.generated/types/job.d.ts" --log-level=silent

echo -e "${GREEN}✅ Type generation complete${NC}"
echo ""
echo "Generated files:"
echo "  • .generated/types/job.d.ts"
