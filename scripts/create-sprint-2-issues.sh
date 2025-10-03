#!/bin/bash

# Sprint 2 GitHub Issues Creation Script
# Creates issues under the 'Sprint 2' milestone

set -e

MILESTONE="Sprint 2"
REPO="theGeekist/wp-kernel"

echo "🚀 Creating Sprint 2 issues for milestone: $MILESTONE"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

# Check if user is authenticated (ignore warnings about other accounts)
if ! gh auth status 2>&1 | grep -q "Logged in to github.com"; then
    echo "❌ Not authenticated with GitHub CLI."
    echo "Run: gh auth login"
    exit 1
fi

# Get milestone number
echo "📋 Finding milestone '$MILESTONE'..."
MILESTONE_NUMBER=$(gh api repos/$REPO/milestones --jq ".[] | select(.title==\"$MILESTONE\") | .number")

if [ -z "$MILESTONE_NUMBER" ]; then
    echo "❌ Milestone '$MILESTONE' not found. Please create it first."
    exit 1
fi

echo "✅ Using milestone #$MILESTONE_NUMBER"
echo ""

# Function to create an issue
create_issue() {
    local title="$1"
    local body="$2"
    local labels="$3"
    
    echo "Creating: $title"
    gh issue create \
        --repo "$REPO" \
        --title "$title" \
        --body "$body" \
        --label "$labels" \
        --milestone "$MILESTONE"
}

# Task 1: Core Factory Implementation
create_issue \
    "Task 1: Core Factory Implementation" \
    "## Description
Implement the single \`createKernelUtils()\` factory that produces \`resource()\`, \`store()\`, and \`events()\` helpers.

## Acceptance Criteria
- [ ] \`createKernelUtils(ctx)\` returns typed \`kernel\` helper
- [ ] \`kernel.resource(config)\` provides: \`seed()\`, \`seedMany()\`, \`remove()\`, \`deleteAll()\`
- [ ] \`kernel.store(storeKey)\` provides: \`wait()\`, \`invalidate()\`, \`getState()\`
- [ ] \`kernel.events(opts?)\` provides: \`list()\`, \`find()\`, \`findAll()\`, \`clear()\`, \`stop()\`
- [ ] All helpers typed with generics (resource-aware, payload-aware)
- [ ] Helpers are thin wrappers (use \`requestUtils.rest\`, \`page.evaluate\`, \`wp.hooks\`)
- [ ] Unit tests for factory and all helper methods (≥90% coverage)

## Implementation Notes
\`\`\`typescript
// Single factory produces everything
const kernel = createKernelUtils({ page, requestUtils, admin, editor, pageUtils });

// Usage
const job = kernel.resource({ name: 'job', routes: {...} });
await job.seed({ title: 'Engineer' });

const jobStore = kernel.store('wpk/job');
const data = await jobStore.wait(s => s.getList());

const recorder = await kernel.events({ pattern: /^wpk\\./ });
\`\`\`

## Dependencies
None

## Estimate
1 day" \
    "e2e-testing,sprint-2,priority:P0"

# Task 2: Fixture Extension & Public API
create_issue \
    "Task 2: Fixture Extension & Public API" \
    "## Description
Extend WordPress's \`test\` fixture with the factory and export public API.

## Acceptance Criteria
- [ ] \`test.extend()\` adds \`kernel\` fixture
- [ ] All WordPress fixtures exposed: \`requestUtils\`, \`admin\`, \`editor\`, \`pageUtils\`, \`page\`
- [ ] \`@geekist/wp-kernel-e2e-utils\` exports \`test\`, \`expect\`
- [ ] TypeScript types exported: \`KernelFixtures\`, \`KernelUtils\`
- [ ] Package.json configured correctly
- [ ] Integration test with WordPress fixtures

## Implementation Notes
\`\`\`typescript
export const test = base.extend({
  kernel: async ({ page, requestUtils, admin, editor, pageUtils }, use) => {
    await use(createKernelUtils({ page, requestUtils, admin, editor, pageUtils }));
  }
});
\`\`\`

## Dependencies
- Task 1: Core Factory Implementation

## Estimate
0.5 day" \
    "e2e-testing,sprint-2,priority:P0"

# Task 3: Integration Tests & Documentation
create_issue \
    "Task 3: Integration Tests & Documentation" \
    "## Description
End-to-end tests with real kernel resources and complete documentation.

## Acceptance Criteria
- [ ] Integration tests with actual \`defineResource\` (job resource)
- [ ] Test seed → store wait → event capture workflow
- [ ] Showcase tests migrated to new utilities
- [ ] API reference with all methods documented
- [ ] Usage examples for all three helpers
- [ ] README with quick start guide
- [ ] CI passes all tests

## Files
- \`/docs/guide/testing/e2e-utils.md\`
- \`/packages/e2e-utils/README.md\`

## Dependencies
- Task 2: Fixture Extension & Public API

## Estimate
1 day" \
    "e2e-testing,sprint-2,priority:P0,documentation"

# Task 4: Polish & Release
create_issue \
    "Task 4: Polish & Release" \
    "## Description
Final review, performance verification, and release prep.

## Acceptance Criteria
- [ ] Performance benchmark: < 100ms fixture overhead
- [ ] Code review completed
- [ ] CHANGELOG.md updated
- [ ] All tests green in CI
- [ ] Sprint retrospective complete

## Dependencies
- Task 3: Integration Tests & Documentation

## Estimate
0.5 day" \
    "e2e-testing,sprint-2,priority:P0,release"

echo ""
echo "✅ Sprint 2 issues created successfully!"
echo ""
echo "View all issues:"
echo "  gh issue list --milestone \"$MILESTONE\""
echo ""
echo "Next steps:"
echo "  1. Review issues and assign team members"
echo "  2. Start with Task 1: git checkout -b 39-core-factory-implementation"
echo "  3. Ship it in 3 days!"
