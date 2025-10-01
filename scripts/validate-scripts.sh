#!/bin/bash
#
# WP Kernel - Script Validation Utility
# Validates all root package.json scripts
#

set -e

echo "=== Validating WP Kernel Scripts ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

validate() {
	local name=$1
	local cmd=$2
	echo -n "Testing '$name'... "
	if eval "$cmd" &>/dev/null; then
		echo -e "${GREEN}✓${NC}"
		return 0
	else
		echo -e "${RED}✗${NC}"
		return 1
	fi
}

validate_output() {
	local name=$1
	local cmd=$2
	local expected=$3
	echo -n "Testing '$name'... "
	output=$(eval "$cmd" 2>&1)
	if echo "$output" | grep -q "$expected"; then
		echo -e "${GREEN}✓${NC}"
		return 0
	else
		echo -e "${RED}✗${NC} (expected: $expected)"
		return 1
	fi
}

# Build scripts
echo "Build Scripts:"
validate "build:packages" "pnpm build:packages"
validate "build:apps" "pnpm build:apps"
validate "build (all)" "pnpm build"

echo ""
echo "Type Checking:"
validate "typecheck" "pnpm typecheck"

echo ""
echo "Linting:"
validate "lint" "pnpm lint"
validate "format:check" "pnpm format:check"

echo ""
echo "Testing:"
validate "test" "pnpm test"

echo ""
echo "Clean:"
validate "clean:dist" "pnpm clean:dist"

echo ""
echo "WordPress (requires wp-env running):"
if docker ps | grep -q wordpress; then
	validate_output "wp:cli" "pnpm wp:cli wp cli version" "WP-CLI"
else
	echo -e "${YELLOW}⚠${NC} Skipping wp:cli (wp-env not running)"
fi

echo ""
echo "=== Validation Complete ==="
