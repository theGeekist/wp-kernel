#!/bin/bash
# Generate TypeScript types from JSON Schema files
# Usage: ./scripts/generate-types.sh

set -e

echo "🔄 Generating TypeScript types from JSON Schema..."

# Colors for output
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Generate types for showcase plugin Job schema
echo "  📝 Generating Job types..."
pnpm exec json2ts \
  examples/showcase-plugin/contracts/job.schema.json \
  --output examples/showcase-plugin/types/job.d.ts \
  --bannerComment "/**\n * Auto-generated TypeScript types from job.schema.json\n * DO NOT EDIT MANUALLY - regenerate with: pnpm types:generate\n */" \
  --unknownAny false \
  --unreachableDefinitions false

echo -e "${GREEN}✅ Type generation complete${NC}"
echo ""
echo "Generated files:"
echo "  • examples/showcase-plugin/types/job.d.ts"
