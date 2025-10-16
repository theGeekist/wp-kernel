# Unit Test Audit & Improvement Plan

## Key Observations

- Workspace-centric tests repeatedly provision and dispose isolated directories within each case, duplicating teardown logic and risking leaked fixtures when assertions throw even though `tests/TEST_PATTERNS.md` already recommends wrapping disposables via shared helpers and the repo-level globals are exposed through `tests/test-utils/wp.test-support.ts`.【F:packages/e2e-utils/src/**tests**/integration-manifest.test.ts†L10-L27】【F:packages/e2e-utils/src/**tests**/integration-workspace.test.ts†L5-L72】【F:tests/TEST_PATTERNS.md†L167-L226】【F:tests/test-utils/wp.test-support.ts†L1-L115】
- File manifest scenarios inline ad-hoc filesystem mutations (`fs.writeFile`, `fs.mkdir`) rather than using descriptive builders, obscuring the intent of each diff and complicating future scenario additions.【F:packages/e2e-utils/src/**tests**/integration-manifest.test.ts†L10-L27】
- CLI runner tests instantiate processes with raw `process.execPath` scripts, lacking reusable helpers for building transcripts or asserting failure cases, leading to verbose, repetitive setups.【F:packages/e2e-utils/src/**tests**/integration-cli-runner.test.ts†L3-L71】
- There is minimal coverage for negative paths (e.g., workspace command failures, manifest permission errors), limiting confidence in the utilities that production E2E suites rely on.

## Actionable Improvements

- [x] **Workspace lifecycle helper exported.** `src/test-support/isolated-workspace.test-support.ts` now wraps `createIsolatedWorkspace`, provides `writeWorkspaceFiles`, and is surfaced via `src/index.ts` and the package exports for reuse across packages.【F:packages/e2e-utils/src/test-support/isolated-workspace.test-support.ts†L1-L176】【F:packages/e2e-utils/src/index.ts†L1-L44】【F:packages/e2e-utils/package.json†L24-L48】
- [ ] **Declarative manifest builders.** Introduce fixture builders that let specs describe manifest structures without manual `fs` choreography, clarifying diff intent.【F:packages/e2e-utils/src/**tests**/integration-manifest.test.ts†L10-L27】
- [x] **CLI runner snippet helper.** `src/test-support/cli-runner.test-support.ts` exposes `runNodeSnippet()` with typed transcripts plus unit coverage so CLI tests focus on expectations over boilerplate.【F:packages/e2e-utils/src/test-support/cli-runner.test-support.ts†L1-L137】【F:packages/e2e-utils/src/**tests**/test-support.test.ts†L1-L78】
- [ ] **Failure-mode scenario tables.** Extend suites with `test.each` coverage for workspace and CLI failure scenarios to guarantee actionable diagnostics for downstream consumers.【F:packages/e2e-utils/src/**tests**/integration-workspace.test.ts†L5-L72】【F:packages/e2e-utils/src/**tests**/integration-cli-runner.test.ts†L3-L71】
- [x] **Helper catalogue documented.** README/AGENT guidance now enumerates the `.test-support.ts` helpers and emphasises colocated self-tests so coverage remains healthy while encouraging reuse.【F:packages/e2e-utils/README.md†L73-L88】【F:packages/e2e-utils/AGENTS.md†L12-L22】【F:packages/e2e-utils/src/**tests**/test-support.test.ts†L1-L78】
