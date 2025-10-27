#!/bin/bash
# Create all Sprint 1 GitHub issues with milestone and labels

set -e

MILESTONE="Sprint 1"

echo "🚀 Creating Sprint 1 GitHub Issues..."
echo ""

# Create milestone first
echo "📍 Creating milestone..."
gh milestone create "$MILESTONE" \
  --title "Sprint 1 - Resources & Stores" \
  --description "Ship defineResource and generated @wordpress/data store" \
  --due-date "2025-10-08" 2>/dev/null || echo "  ℹ️  Milestone already exists"

echo ""

# Create labels
echo "🏷️  Creating labels..."
gh label create "sprint-1" --color "0E8A16" --description "Sprint 1 tasks" -f 2>/dev/null || true
gh label create "type:enhancement" --color "A2EEEF" --description "New feature" -f 2>/dev/null || true
gh label create "type:testing" --color "FBCA04" --description "Testing" -f 2>/dev/null || true
gh label create "type:documentation" --color "0075CA" --description "Documentation" -f 2>/dev/null || true
gh label create "type:ci/cd" --color "D93F0B" --description "CI/CD" -f 2>/dev/null || true

echo ""
echo "📝 Creating issues..."
echo ""

# Phase A: Kernel Primitives
gh issue create \
  --title "A1: Result Types & Errors" \
  --body "## Goal
Ensure WPKernelError path is hooked in transport. Normalize TransportError/ServerError.

## Tasks
- [ ] Create base WPKernelError class with \`code\`, \`message\`, \`data\`, \`context\`
- [ ] Create TransportError subclass (status, path, method)
- [ ] Create ServerError subclass (parse WordPress REST errors)
- [ ] Add unit tests for serialization/deserialization

## Files
- \`packages/core/src/errors/WPKernelError.ts\`
- \`packages/core/src/errors/TransportError.ts\`
- \`packages/core/src/errors/ServerError.ts\`
- \`packages/core/src/errors/types.ts\`

## Estimate
2 hours

## Dependencies
None" \
  --label "sprint-1,type:enhancement" \
  --milestone "$MILESTONE"

gh issue create \
  --title "A2: defineResource Public API" \
  --body "## Goal
Input validation, normalize routes, attach cacheKeys, expose client + storeKey.

## Tasks
- [ ] Config validation (throw DeveloperError if invalid)
- [ ] Route normalization (ensure required methods)
- [ ] Client generation (list, get, create stub)
- [ ] Return ResourceObject with typed methods
- [ ] Unit tests for config validation and route interpolation

## Files
- \`packages/core/src/resource/defineResource.ts\`
- \`packages/core/src/resource/types.ts\`
- \`packages/core/src/resource/interpolate.ts\`

## Estimate
6 hours

## Dependencies
A1" \
  --label "sprint-1,type:enhancement" \
  --milestone "$MILESTONE"

gh issue create \
  --title "A3: Store Factory" \
  --body "## Goal
Create namespaced @wordpress/data store with selectors/resolvers/actions; wire event emission.

## Tasks
- [ ] Create store config builder
- [ ] Implement selectors: \`getById\`, \`getList\`, \`isResolving\`, \`hasResolved\`
- [ ] Implement resolvers: async fetch with client
- [ ] Implement actions: \`receiveItems\`, \`receiveItem\`, \`receiveError\`, \`invalidate\`
- [ ] Wire event emission
- [ ] Unit tests with mocked @wordpress/data

## Files
- \`packages/core/src/resource/createStore.ts\`
- \`packages/core/src/resource/storeConfig.ts\`

## Estimate
1 day (8 hours)

## Dependencies
A2" \
  --label "sprint-1,type:enhancement" \
  --milestone "$MILESTONE"

gh issue create \
  --title "A4: Cache Invalidation Helper" \
  --body "## Goal
\`invalidate([...keys])\` → delete list caches and mark selectors stale.

## Tasks
- [ ] Implement invalidate() function
- [ ] Cache key matching (support patterns)
- [ ] Deterministic key generation
- [ ] Unit tests for matching and invalidation

## Files
- \`packages/core/src/resource/invalidate.ts\`
- \`packages/core/src/resource/cacheKeys.ts\`

## Estimate
2 hours

## Dependencies
A3" \
  --label "sprint-1,type:enhancement" \
  --milestone "$MILESTONE"

gh issue create \
  --title "A5: _fields Support" \
  --body "## Goal
When route.fields exists, add \`?_fields=a,b,c\` to GET requests.

## Tasks
- [ ] Add _fields query param construction in transport layer
- [ ] Unit tests for query param handling

## Files
- \`packages/core/src/transport/fetch.ts\`

## Estimate
1 hour

## Dependencies
A1" \
  --label "sprint-1,type:enhancement" \
  --milestone "$MILESTONE"

gh issue create \
  --title "A6: Docs (Resources)" \
  --body "## Goal
Example-first guide + API signature page.

## Tasks
- [ ] Write 3-step \"Hello Resource\" tutorial (schema → defineResource → render list)
- [ ] API reference documentation with TypeScript signatures
- [ ] Code examples that compile
- [ ] Add to VitePress site navigation

## Files
- \`docs/guide/resources.md\`
- \`docs/api/resources.md\`

## Estimate
3 hours

## Dependencies
A2, A3" \
  --label "sprint-1,type:documentation" \
  --milestone "$MILESTONE"

# Phase B: Contracts & Showcase
gh issue create \
  --title "B1: JSON Schema + Types" \
  --body "## Goal
Create \`contracts/job.schema.json\` and generate TypeScript types.

## Tasks
- [ ] Create job.schema.json (id, title, status, created_at, department, location)
- [ ] Setup type generation pipeline
- [ ] Generate Job interface
- [ ] Add to build process

## Files
- \`contracts/job.schema.json\`
- Generated: \`types/Job.d.ts\`

## Estimate
1 hour

## Dependencies
None" \
  --label "sprint-1,type:enhancement" \
  --milestone "$MILESTONE"

gh issue create \
  --title "B2: REST Stub" \
  --body "## Goal
PHP routes in showcase plugin: list, get, create.

## Tasks
- [ ] Create base REST controller
- [ ] Create Jobs_Controller extending base
- [ ] \`GET /wpk/v1/jobs\` - List with static data
- [ ] \`GET /wpk/v1/jobs/:id\` - Get single
- [ ] \`POST /wpk/v1/jobs\` - Create
- [ ] Respect _fields parameter
- [ ] Register routes in plugin bootstrap
- [ ] Test with \`wp-env run cli wp rest-api list\`

## Files
- \`examples/showcase/includes/class-rest-controller.php\`
- \`examples/showcase/includes/rest/class-jobs-controller.php\`

## Estimate
3 hours

## Dependencies
B1" \
  --label "sprint-1,type:enhancement" \
  --milestone "$MILESTONE"

gh issue create \
  --title "B3: Resource Declaration in Showcase" \
  --body "## Goal
Define job resource using defineResource.

## Tasks
- [ ] Create job.ts resource file
- [ ] Define job resource with routes and cacheKeys
- [ ] Verify store registration
- [ ] Export from plugin entry point

## Files
- \`examples/showcase/src/resources/job.ts\`

## Estimate
1 hour

## Dependencies
A2, B1, B2" \
  --label "sprint-1,type:enhancement" \
  --milestone "$MILESTONE"

gh issue create \
  --title "B4: Admin Page (JobsList)" \
  --body "## Goal
Mount admin page with list display and create form.

## Tasks
- [ ] Create JobsList component
- [ ] Use \`useSelect\` to read from store
- [ ] Show loading/empty/error states
- [ ] Add tiny create form calling \`client.create()\`
- [ ] Register admin page (Tools menu)
- [ ] Build and test in wp-env

## Files
- \`examples/showcase/src/admin/pages/JobsList.tsx\`

## Estimate
4 hours

## Dependencies
B3" \
  --label "sprint-1,type:enhancement" \
  --milestone "$MILESTONE"

# Phase C: Tests & CI
gh issue create \
  --title "C1: Unit Tests (Kernel)" \
  --body "## Goal
Unit tests for cache keys, resolvers, _fields, errors, events.

## Tasks
- [ ] Cache key determinism tests
- [ ] Resolver behavior tests (async flow)
- [ ] _fields query param tests
- [ ] Error mapping to WPKernelError tests
- [ ] Event emission with requestId tests

## Coverage Target
60%+ for new code

## Files
- \`packages/core/src/**/__tests__/\`

## Estimate
4 hours

## Dependencies
A1-A5" \
  --label "sprint-1,type:testing" \
  --milestone "$MILESTONE"

gh issue create \
  --title "C2: Integration Tests (Kernel + MSW)" \
  --body "## Goal
Mock REST endpoints; ensure events emitted and store populated.

## Tasks
- [ ] Setup MSW (Mock Service Worker)
- [ ] Mock \`/wpk/v1/jobs\` endpoints
- [ ] Test event emission flow
- [ ] Test store population after resolver
- [ ] Test error handling

## Files
- \`packages/core/src/__tests__/integration/\`

## Estimate
3 hours

## Dependencies
C1" \
  --label "sprint-1,type:testing" \
  --milestone "$MILESTONE"

gh issue create \
  --title "C3: E2E (Playwright)" \
  --body "## Goal
Visit admin Jobs page, assert list rendering; verify no console errors.

## Tasks
- [ ] Login and navigate to \`/wp-admin/admin.php?page=wpk-jobs\`
- [ ] Assert ≥5 jobs displayed
- [ ] Verify no console errors
- [ ] Test loading state
- [ ] Test empty state
- [ ] Verify _fields parameter in network calls (Playwright route interception)

## Files
- \`packages/e2e-utils/tests/sprint-1-resources.spec.ts\`

## Tests Site
localhost:8889

## Estimate
3 hours

## Dependencies
B4, C1" \
  --label "sprint-1,type:testing" \
  --milestone "$MILESTONE"

gh issue create \
  --title "C4: CI & Docs Hooks" \
  --body "## Goal
Add docs/guide/resources.md to VitePress; add tests to CI matrix.

## Tasks
- [ ] Update VitePress config with new docs pages
- [ ] Update CI workflow for new test files
- [ ] Test on WP 6.8 & latest

## Files
- \`.github/workflows/ci.yml\`
- \`docs/.vitepress/config.ts\`

## Estimate
1 hour

## Dependencies
C3, A6" \
  --label "sprint-1,type:ci/cd" \
  --milestone "$MILESTONE"

echo ""
echo "✅ All Sprint 1 issues created!"
echo ""
echo "📋 Next steps:"
echo "  1. View issues: gh issue list --milestone 'Sprint 1'"
echo "  2. Assign issues: gh issue edit <number> --assignee <username>"
echo "  3. Start working: git checkout -b sprint-1/<task-id>"
echo ""
