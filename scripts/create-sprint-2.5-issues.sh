#!/bin/bash

# Sprint 2.5 GitHub Issues Creation Script
# Creates issues under the 'Sprint 2.5' milestone

set -e

MILESTONE="Sprint 2.5"
REPO="theGeekist/wp-kernel"

echo "🚀 Creating Sprint 2.5 issues for milestone: $MILESTONE"
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

# Task 2: Namespace Detection Implementation
create_issue \
    "Task 2: Namespace Detection Implementation" \
    "## Description
Implement intelligent namespace auto-detection from plugin headers and package.json while maintaining backward compatibility.

## Acceptance Criteria
- [ ] **Plugin Auto-detection**: Extract namespace from WordPress plugin headers (\`Plugin Name\`, \`Text Domain\`)
- [ ] **Package.json Detection**: Use \`name\` field as fallback for build environments
- [ ] **Validation**: Sanitize extracted namespaces (lowercase, kebab-case, no reserved words)
- [ ] **Fallback Strategy**: Default to \`wpk\` if detection fails
- [ ] **Override Support**: Allow explicit namespace parameter
- [ ] **Runtime Context**: Work in both WordPress and build environments
- [ ] **Unit Tests**: Edge cases, validation, fallback scenarios (≥95% coverage)

## Implementation Notes
\`\`\`typescript
// Auto-detection priority:
// 1. Explicit namespace parameter
// 2. WordPress plugin header 'Text Domain'
// 3. package.json 'name' field 
// 4. Fallback to 'wpk'

function detectNamespace(explicit?: string): string {
  if (explicit) return sanitize(explicit);
  
  // WordPress context
  if (typeof wp !== 'undefined') {
    const textDomain = extractFromPluginHeader();
    if (textDomain) return sanitize(textDomain);
  }
  
  // Build context
  const packageName = extractFromPackageJson();
  if (packageName) return sanitize(packageName);
  
  return 'wpk'; // Safe fallback
}
\`\`\`

## Files to Create/Update
- \`packages/kernel/src/namespace/detect.ts\`
- \`packages/kernel/src/namespace/__tests__/detect.test.ts\`

## Dependencies
None (foundational)

## Estimate
1 day" \
    "namespace,sprint-2.5,priority:P0,architecture"

# Task 3: Resource Definition Updates
create_issue \
    "Task 3: Resource Definition Updates" \
    "## Description
Update \`defineResource\` to accept and use namespace configuration for event names and store registration.

## Acceptance Criteria
- [ ] **Namespace Parameter**: Add optional \`namespace\` to \`ResourceConfig\`
- [ ] **Auto-detection Integration**: Use namespace detection if not provided
- [ ] **Event Name Generation**: Generate events as \`{namespace}.{resource}.{action}\`
- [ ] **Store Registration**: Register stores with namespace-aware keys
- [ ] **Backward Compatibility**: Existing code works without changes
- [ ] **TypeScript Types**: Update interfaces and generate proper types
- [ ] **Unit Tests**: Test namespace scenarios and backward compatibility

## Implementation Notes
\`\`\`typescript
interface ResourceConfig<T> {
  name: string;
  routes: ResourceRoutes;
  schema?: JSONSchema;
  cacheKeys?: CacheKeys<T>;
  namespace?: string; // NEW: explicit namespace override
}

export function defineResource<T>(config: ResourceConfig<T>) {
  const namespace = config.namespace || detectNamespace();
  
  return {
    // Events use detected/provided namespace
    events: {
      created: \`\${namespace}.\${config.name}.created\`,
      updated: \`\${namespace}.\${config.name}.updated\`,
      removed: \`\${namespace}.\${config.name}.removed\`
    },
    // Store uses namespace-aware key
    store: registerStore(\`\${namespace}/\${config.name}\`, storeConfig)
  };
}
\`\`\`

## Files to Update
- \`packages/kernel/src/resource/define.ts\`
- \`packages/kernel/src/resource/__tests__/define.test.ts\`
- \`packages/kernel/src/resource/types.ts\`

## Dependencies
- Task 2: Namespace Detection Implementation

## Estimate
1 day" \
    "namespace,sprint-2.5,priority:P0,resources"

# Task 4: E2E Utils Namespace Integration
create_issue \
    "Task 4: E2E Utils Namespace Integration" \
    "## Description
Update E2E testing utilities to respect and test namespace-aware resource definitions and event patterns.

## Acceptance Criteria
- [ ] **Resource Helper Updates**: Support namespace parameter in resource definitions
- [ ] **Event Helper Updates**: Filter events by namespace patterns
- [ ] **Store Helper Updates**: Handle namespace-aware store keys
- [ ] **Test Context**: Provide namespace context to test utilities
- [ ] **Documentation Updates**: Show namespace-aware testing examples
- [ ] **Integration Tests**: Test with various namespace scenarios

## Implementation Notes
\`\`\`typescript
// E2E resource helpers should handle namespaces
const helper = kernel.resource({
  name: 'job',
  namespace: 'my-plugin', // Should respect this
  routes: { /* ... */ }
});

// Event helpers should filter by namespace
const events = await kernel.events({ pattern: /^my-plugin\./ });

// Store helpers should use correct keys
const store = kernel.store('my-plugin/job');
\`\`\`

## Files to Update
- \`packages/e2e-utils/src/createResourceHelper.ts\`
- \`packages/e2e-utils/src/createEventHelper.ts\`
- \`packages/e2e-utils/src/createStoreHelper.ts\`
- \`packages/e2e-utils/src/__tests__/*.test.ts\`

## Dependencies
- Task 3: Resource Definition Updates

## Estimate
0.5 day" \
    "namespace,sprint-2.5,priority:P1,e2e-testing"

# Task 5: Framework Namespace Audit
create_issue \
    "Task 5: Framework Namespace Audit" \
    "## Description
Audit and update framework code to eliminate hardcoded \`wpk\` assumptions and ensure proper namespace usage.

## Acceptance Criteria
- [ ] **Code Audit**: Remove all hardcoded \`wpk.*\` references
- [ ] **Framework Events**: Keep core framework events as \`wpk.*\` (transport, system, etc.)
- [ ] **Resource Events**: Use detected namespace for user resources
- [ ] **Store Keys**: Use namespace-aware store registration
- [ ] **Error Messages**: Update to mention namespace configuration
- [ ] **Examples**: Update all code examples to show auto-detection

## Implementation Notes
- Framework events (transport, errors) remain \`wpk.*\`
- User resource events use detected namespace
- Clear separation between framework and application events

## Files to Audit
- \`packages/kernel/src/resource/\`
- \`packages/kernel/src/http/\`
- \`packages/kernel/src/error/\`
- All test files for hardcoded references

## Dependencies
- Task 4: E2E Utils Namespace Integration

## Estimate
0.5 day" \
    "namespace,sprint-2.5,priority:P1,refactor"

# Task 6: E2E Security Vulnerability Fix
create_issue \
    "Task 6: E2E Security Vulnerability Fix" \
    "## Description
Address critical security vulnerability in E2E testing utilities where dynamic function execution creates code injection risks.

## Acceptance Criteria
- [ ] **Identify Vulnerability**: Audit E2E utils for dynamic function execution
- [ ] **Secure Alternatives**: Replace dangerous patterns with safe alternatives
- [ ] **Input Validation**: Add proper validation for user inputs
- [ ] **Security Testing**: Add tests for injection attempts
- [ ] **Documentation**: Document secure usage patterns
- [ ] **Code Review**: Security-focused review of changes

## Security Context
Dynamic function execution in testing utilities can create code injection vectors. This needs immediate attention as it affects the testing infrastructure security.

## Implementation Notes
- Replace \`eval()\`, \`Function()\`, or similar dynamic execution
- Use typed interfaces and validation instead
- Implement allowlists for permitted operations
- Add input sanitization

## Files to Audit
- \`packages/e2e-utils/src/\`
- Focus on event helpers and dynamic test execution

## Dependencies
- Task 5: Framework Namespace Audit

## Estimate
0.5 day" \
    "security,sprint-2.5,priority:P0,e2e-testing"

# Task 7: Showcase App UI Loading States
create_issue \
    "Task 7: Showcase App UI Loading States" \
    "## Description
Implement proper UI loading states in the showcase app to fix timing issues with E2E testing, particularly for bulk operations and rapid state changes.

## Background
Sprint 2 delivered a working E2E testing framework, but 1 test was skipped due to showcase app UI limitations: \"should seed multiple jobs and verify count\" fails due to jobs rendering too fast with timing issues during 3 simultaneous creates.

## Acceptance Criteria
- [ ] **Loading State Implementation**: Add proper loading indicators during resource operations
- [ ] **Bulk Operation Support**: Handle rapid successive operations (seed multiple jobs)
- [ ] **UI Stability**: Prevent flash of content during loading
- [ ] **E2E Test Fix**: Previously skipped test now passes
- [ ] **User Experience**: Smooth loading transitions
- [ ] **Accessibility**: Loading states are screen reader accessible

## Implementation Notes
\`\`\`typescript
// Jobs list should show loading state during operations
const [loading, setLoading] = useState(false);

const handleBulkSeed = async () => {
  setLoading(true);
  try {
    await Promise.all([
      CreateJob({ data: job1 }),
      CreateJob({ data: job2 }),
      CreateJob({ data: job3 })
    ]);
  } finally {
    setLoading(false);
  }
};
\`\`\`

## Files to Update
- \`app/showcase/src/admin/pages/JobsList.tsx\`
- \`app/showcase/src/components/\` (loading components)

## Test Target
- Re-enable test: \"should seed multiple jobs and verify count\"

## Dependencies
- Task 6: E2E Security Vulnerability Fix

## Estimate
0.5 day" \
    "showcase,sprint-2.5,priority:P1,ui,sprint-2-completion"

# Task 8: E2E Store Registration Timing Fix
create_issue \
    "Task 8: E2E Store Registration Timing Fix" \
    "## Description
Fix @wordpress/data store registration timing issues in E2E testing environment to enable reliable store selector testing.

## Background
Sprint 2 delivered working store integration, but 1 test was skipped due to store timing issues: \"should wait for store to resolve job data\" fails because the showcase app's @wordpress/data store registration has timing issues in the E2E environment.

## Acceptance Criteria
- [ ] **Store Registration Fix**: Ensure @wordpress/data store is properly registered before E2E tests run
- [ ] **Timing Resolution**: Fix timing issues with store initialization in test environment
- [ ] **Selector Availability**: Verify store selectors are available when tests execute
- [ ] **Registration Verification**: Add proper store registration verification
- [ ] **E2E Test Fix**: Previously skipped test now passes
- [ ] **Reliable Testing**: Store helpers work consistently in E2E environment

## Implementation Notes
\`\`\`typescript
// Ensure store is registered before app initialization
export function initializeApp() {
  // Register store first
  registerJobStore();
  
  // Wait for registration to complete
  await waitForStoreRegistration('wpk/job');
  
  // Then render app
  render(<App />);
}
\`\`\`

## Files to Update
- \`app/showcase/src/index.ts\`
- \`app/showcase/src/stores/\` (store registration)

## Test Target
- Re-enable test: \"should wait for store to resolve job data\"

## Dependencies
- Task 7: Showcase App UI Loading States

## Estimate
0.5 day" \
    "showcase,sprint-2.5,priority:P1,e2e-testing,store,sprint-2-completion"

echo ""
echo "✅ Sprint 2.5 issues created successfully!"
echo ""
echo "📊 Summary:"
echo "  • Task 1: ✅ Already completed (Documentation)"
echo "  • Tasks 2-6: 🔧 Namespace architecture implementation"
echo "  • Tasks 7-8: 🎯 Sprint 2 completion (showcase app fixes)"
echo ""
echo "View all issues:"
echo "  gh issue list --milestone \"$MILESTONE\""
echo ""
echo "Next steps:"
echo "  1. Review issues and assign team members"
echo "  2. Start with Task 2: git checkout -b namespace-detection-implementation"
echo "  3. Ship namespace architecture + Sprint 2 completion in 3 days!"