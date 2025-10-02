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

# Check if user is authenticated
if ! gh auth status &> /dev/null; then
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
        --milestone "$MILESTONE_NUMBER"
}

# Task 1.1: Create createResourceUtils
create_issue \
    "Task 1.1: Create \`createResourceUtils\`" \
    "## Description
Implement resource seeding/cleanup utilities that work with \`defineResource\` output.

## Acceptance Criteria
- [ ] \`createResourceUtils(resourceObj, requestUtils)\` returns utility object
- [ ] \`seed(data)\` calls \`resourceObj.create()\` internally
- [ ] \`seedMany(items)\` handles bulk creation
- [ ] \`remove(id)\` calls \`resourceObj.remove()\`
- [ ] \`deleteAll()\` clears all test data
- [ ] TypeScript generics infer types from resource config
- [ ] Unit tests with mock \`requestUtils\` (≥90% coverage)

## Implementation Notes
\`\`\`typescript
// Usage
const utils = kernel.resource(job);
await utils.seed({ title: 'Engineer', salary: 100000 });
\`\`\`

## Dependencies
None

## Estimate
1 day

## Phase
Phase 1: Core Utilities (Week 1, Days 1-3)" \
    "e2e-testing,sprint-2,priority:P0"

# Task 1.2: Create createStoreUtils
create_issue \
    "Task 1.2: Create \`createStoreUtils\`" \
    "## Description
Implement store polling utilities for waiting on \`@wordpress/data\` state.

## Acceptance Criteria
- [ ] \`createStoreUtils(storeKey, page)\` returns utility object
- [ ] \`wait(selector, options?)\` polls until data appears
- [ ] \`invalidate(cacheKeys?)\` triggers store invalidation
- [ ] \`getState()\` returns current store state
- [ ] Configurable timeout/interval (defaults: 5s timeout, 100ms interval)
- [ ] Proper error messages on timeout
- [ ] Unit tests with mock Playwright page (≥90% coverage)

## Implementation Notes
\`\`\`typescript
// Usage
const store = kernel.store(job.storeKey); // 'wpk/job'
const jobs = await store.wait(s => s.getList());
\`\`\`

## Dependencies
None

## Estimate
1 day

## Phase
Phase 1: Core Utilities (Week 1, Days 1-3)" \
    "e2e-testing,sprint-2,priority:P0"

# Task 1.3: Create createEventCapture
create_issue \
    "Task 1.3: Create \`createEventCapture\`" \
    "## Description
Implement event capture utilities for asserting on kernel events.

## Acceptance Criteria
- [ ] \`createEventCapture(page, options?)\` returns recorder object
- [ ] Captures events matching pattern (default: \`/^wpk\\./\`)
- [ ] \`list()\` returns all captured events
- [ ] \`find(eventName)\` returns first matching event
- [ ] \`findAll(eventName)\` returns all matching events
- [ ] \`clear()\` resets captured events
- [ ] \`stop()\` removes listener
- [ ] Injects via \`wp.hooks.addAction('all', ...)\`
- [ ] Unit tests with mock page.evaluate (≥90% coverage)

## Implementation Notes
\`\`\`typescript
// Usage
const recorder = await kernel.events({ pattern: /^wpk\\./ });
// ... trigger actions
expect(recorder.find('wpk.resource.created')).toBeTruthy();
await recorder.stop();
\`\`\`

## Dependencies
None

## Estimate
1 day

## Phase
Phase 1: Core Utilities (Week 1, Days 1-3)" \
    "e2e-testing,sprint-2,priority:P0"

# Task 2.1: Create Extended Fixture
create_issue \
    "Task 2.1: Create Extended Fixture" \
    "## Description
Extend WordPress's \`test\` fixture with kernel utilities.

## Acceptance Criteria
- [ ] \`test.extend()\` adds \`kernel\` fixture
- [ ] \`kernel.resource(config)\` returns \`createResourceUtils\`
- [ ] \`kernel.store(storeKey)\` returns \`createStoreUtils\`
- [ ] \`kernel.events(opts?)\` returns \`createEventCapture\`
- [ ] All WordPress fixtures exposed: \`requestUtils\`, \`admin\`, \`editor\`, \`pageUtils\`, \`page\`
- [ ] Proper TypeScript types exported
- [ ] Integration test with actual WordPress fixtures

## Implementation Notes
\`\`\`typescript
export const test = base.extend({
  kernel: async ({ page, requestUtils, admin, editor, pageUtils }, use) => {
    await use({
      resource: (config) => createResourceUtils(config, requestUtils),
      store: (storeKey) => createStoreUtils(storeKey, page),
      events: (opts?) => createEventCapture(page, opts),
      requestUtils, admin, editor, pageUtils, page,
    });
  }
});
\`\`\`

## Dependencies
- Task 1.1: Create createResourceUtils
- Task 1.2: Create createStoreUtils
- Task 1.3: Create createEventCapture

## Estimate
1 day

## Phase
Phase 2: Fixture Integration (Week 1, Days 4-5)" \
    "e2e-testing,sprint-2,priority:P0"

# Task 2.2: Export Public API
create_issue \
    "Task 2.2: Export Public API" \
    "## Description
Create package entry point with proper exports.

## Acceptance Criteria
- [ ] \`@geekist/wp-kernel-e2e-utils\` exports \`test\`, \`expect\`
- [ ] Re-exports WordPress utilities for convenience
- [ ] TypeScript definitions include all generics
- [ ] Package.json configured with correct entry points
- [ ] Can be imported in Playwright tests

## Implementation Notes
\`\`\`typescript
// src/index.ts
export { test, expect } from './fixture';
export type { KernelFixtures } from './types';
export { createResourceUtils, createStoreUtils, createEventCapture } from './utils';
\`\`\`

## Dependencies
- Task 2.1: Create Extended Fixture

## Estimate
0.5 day

## Phase
Phase 2: Fixture Integration (Week 1, Days 4-5)" \
    "e2e-testing,sprint-2,priority:P0"

# Task 3.1: Unit Tests
create_issue \
    "Task 3.1: Unit Tests" \
    "## Description
Comprehensive unit tests for all utilities.

## Acceptance Criteria
- [ ] \`createResourceUtils\` tests (mock requestUtils)
- [ ] \`createStoreUtils\` tests (mock page.evaluate)
- [ ] \`createEventCapture\` tests (mock hook injection)
- [ ] Fixture extension tests
- [ ] ≥90% code coverage for all utilities
- [ ] All edge cases covered (timeouts, errors, empty data)

## Dependencies
- All Phase 1 and Phase 2 tasks

## Estimate
1 day

## Phase
Phase 3: Testing & Documentation (Week 2, Days 6-8)" \
    "e2e-testing,sprint-2,priority:P0,testing"

# Task 3.2: Integration Tests
create_issue \
    "Task 3.2: Integration Tests" \
    "## Description
End-to-end tests using actual kernel resources.

## Acceptance Criteria
- [ ] Test with real \`defineResource\` (job resource)
- [ ] Seed data and verify store state
- [ ] Capture events during resource operations
- [ ] Test all three usage patterns (fixture, direct, escape hatch)
- [ ] Run against wp-env test site
- [ ] CI passes on all tests

## Implementation Notes
\`\`\`typescript
test('seed and wait for store', async ({ kernel }) => {
  const utils = kernel.resource(job);
  await utils.seed({ title: 'Engineer' });
  
  const store = kernel.store(job.storeKey);
  const jobs = await store.wait(s => s.getList());
  
  expect(jobs.items.length).toBeGreaterThan(0);
});
\`\`\`

## Dependencies
- Task 3.1: Unit Tests

## Estimate
1 day

## Phase
Phase 3: Testing & Documentation (Week 2, Days 6-8)" \
    "e2e-testing,sprint-2,priority:P0,testing"

# Task 3.3: API Reference Documentation
create_issue \
    "Task 3.3: API Reference Documentation" \
    "## Description
Document all utilities with examples.

## Acceptance Criteria
- [ ] API reference for \`kernel.resource()\`
- [ ] API reference for \`kernel.store()\`
- [ ] API reference for \`kernel.events()\`
- [ ] Usage examples with actual kernel code
- [ ] \"Annotate & Expose\" philosophy explained
- [ ] Migration guide from raw WordPress utils
- [ ] TSDoc comments on all public APIs

## File
\`/docs/guide/testing/e2e-utils.md\`

## Dependencies
- Task 3.1: Unit Tests
- Task 3.2: Integration Tests

## Estimate
1 day

## Phase
Phase 3: Testing & Documentation (Week 2, Days 6-8)" \
    "e2e-testing,sprint-2,priority:P0,documentation"

# Task 4.1: Showcase Tests Migration
create_issue \
    "Task 4.1: Showcase Tests Migration" \
    "## Description
Migrate showcase plugin tests to use new utilities.

## Acceptance Criteria
- [ ] Update job tests to use \`kernel.resource(job)\`
- [ ] Replace manual polling with \`kernel.store()\`
- [ ] Add event assertions with \`kernel.events()\`
- [ ] Verify all tests pass
- [ ] Compare test code readability (before/after)

## Dependencies
- Task 3.2: Integration Tests

## Estimate
0.5 day

## Phase
Phase 4: Polish & Examples (Week 2, Days 9-10)" \
    "e2e-testing,sprint-2,priority:P1"

# Task 4.2: Performance Benchmarks
create_issue \
    "Task 4.2: Performance Benchmarks" \
    "## Description
Measure fixture overhead and polling performance.

## Acceptance Criteria
- [ ] Fixture extension adds < 100ms overhead
- [ ] Store polling resolves within expected timeout
- [ ] Event capture doesn't affect test performance
- [ ] Document performance characteristics

## Dependencies
- Task 4.1: Showcase Tests Migration

## Estimate
0.5 day

## Phase
Phase 4: Polish & Examples (Week 2, Days 9-10)" \
    "e2e-testing,sprint-2,priority:P2,performance"

# Task 4.3: README & Examples
create_issue \
    "Task 4.3: README & Examples" \
    "## Description
Package README with quick examples.

## Acceptance Criteria
- [ ] README.md in package root
- [ ] Quick start guide
- [ ] Example with \`defineResource\`
- [ ] Link to full API docs
- [ ] Installation instructions

## File
\`/packages/e2e-utils/README.md\`

## Dependencies
- Task 3.3: API Reference Documentation

## Estimate
0.5 day

## Phase
Phase 4: Polish & Examples (Week 2, Days 9-10)" \
    "e2e-testing,sprint-2,priority:P1,documentation"

# Task 4.4: Final Review & Release
create_issue \
    "Task 4.4: Final Review & Release" \
    "## Description
Code review, CI verification, and changelog.

## Acceptance Criteria
- [ ] All tests pass in CI
- [ ] Code review completed
- [ ] CHANGELOG.md updated
- [ ] Sprint retrospective complete
- [ ] Package published (if applicable)

## Dependencies
- All previous tasks

## Estimate
0.5 day

## Phase
Phase 4: Polish & Examples (Week 2, Days 9-10)" \
    "e2e-testing,sprint-2,priority:P0,release"

echo ""
echo "✅ Sprint 2 issues created successfully!"
echo ""
echo "View all issues:"
echo "  gh issue list --milestone \"$MILESTONE\""
echo ""
echo "Next steps:"
echo "  1. Review issues and assign team members"
echo "  2. Checkout sprint branch: git checkout -b sprint-2/e2e-utils"
echo "  3. Start with Task 1.1!"
