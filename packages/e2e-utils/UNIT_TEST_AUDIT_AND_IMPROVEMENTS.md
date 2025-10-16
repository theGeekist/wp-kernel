# Unit Test Audit & Improvement Plan

## Key Observations

- Workspace-centric tests repeatedly provision and dispose isolated directories within each case, duplicating teardown logic and risking leaked fixtures when assertions throw.【F:packages/e2e-utils/src/**tests**/integration-manifest.test.ts†L10-L27】【F:packages/e2e-utils/src/**tests**/integration-workspace.test.ts†L5-L72】
- File manifest scenarios inline ad-hoc filesystem mutations (`fs.writeFile`, `fs.mkdir`) rather than using descriptive builders, obscuring the intent of each diff and complicating future scenario additions.【F:packages/e2e-utils/src/**tests**/integration-manifest.test.ts†L10-L27】
- CLI runner tests instantiate processes with raw `process.execPath` scripts, lacking reusable helpers for building transcripts or asserting failure cases, leading to verbose, repetitive setups.【F:packages/e2e-utils/src/**tests**/integration-cli-runner.test.ts†L3-L71】
- There is minimal coverage for negative paths (e.g., workspace command failures, manifest permission errors), limiting confidence in the utilities that production E2E suites rely on.

## Actionable Improvements

1. Provide a `withIsolatedWorkspace` helper that wraps `createIsolatedWorkspace` and automatically calls `dispose` in a `finally` block, allowing tests to supply async callbacks and preventing resource leaks.【F:packages/e2e-utils/src/**tests**/integration-workspace.test.ts†L5-L72】
2. Create fixture builders (e.g., `workspace.writeFiles({ path: contents })`) so manifest-oriented specs can describe structures declaratively, clarifying intent and reducing manual filesystem choreography.【F:packages/e2e-utils/src/**tests**/integration-manifest.test.ts†L10-L27】
3. Add a `runNodeSnippet` helper around `createCliRunner` that accepts inline scripts and returns typed transcripts, so CLI runner specs focus on expected behaviour rather than child-process boilerplate.【F:packages/e2e-utils/src/**tests**/integration-cli-runner.test.ts†L3-L71】
4. Expand scenario coverage with `test.each` tables for failure modes (timeouts, permission errors, missing tools) to ensure utilities surface actionable diagnostics when downstream suites encounter flaky environments.
