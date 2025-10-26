# @wpkernel/e2e-utils - Test Audit (2024-09)

## Current Baseline

- Workspace-driven suites now share `withIsolatedWorkspace()` + `writeWorkspaceFiles()` so setup/teardown and fixture authoring stay declarative across manifest, bundle, workspace, and registry coverage.【F:packages/e2e-utils/src/test-support/isolated-workspace.test-support.ts†L1-L63】【F:packages/e2e-utils/src/**tests**/integration-manifest.test.ts†L1-L40】【F:packages/e2e-utils/src/**tests**/integration-bundle-inspector.test.ts†L4-L52】【F:packages/e2e-utils/src/**tests**/integration-registry.test.ts†L1-L74】【F:packages/e2e-utils/src/**tests**/integration-workspace.test.ts†L1-L64】
- Declarative manifest assertions lean on `collectManifestState()` / `compareManifestStates()` so specs describe before/after trees while helpers manage filesystem mutation and diffing.【F:packages/e2e-utils/src/test-support/fs-manifest.test-support.ts†L1-L80】【F:packages/e2e-utils/src/**tests**/integration-manifest.test.ts†L4-L40】
- CLI and workspace helpers both surface failure diagnostics (non-zero exits, spawn errors, timeouts) through shared scenario tables, ensuring transcripts always include command context and bounded runtimes.【F:packages/e2e-utils/src/**tests**/integration-cli-runner.test.ts†L1-L120】【F:packages/e2e-utils/src/**tests**/integration-workspace.test.ts†L1-L120】
- Smoke tests for the helper catalogue (`runNodeSnippet`, workspace lifecycle) live in `test-support.test.ts`, giving fast feedback when refactoring helper exports.【F:packages/e2e-utils/src/**tests**/test-support.test.ts†L1-L40】

## Strengths

- Suites prioritise intent over plumbing: declarative file trees, scenario tables, and shared fixtures keep each case under ~100 lines while covering core behaviours.【F:packages/e2e-utils/src/**tests**/integration-bundle-inspector.test.ts†L8-L52】【F:packages/e2e-utils/src/**tests**/integration-workspace.test.ts†L8-L120】
- Failure-path assertions verify transcript metadata (stderr, command, args, env, duration), boosting trust in DX-critical debugging output.【F:packages/e2e-utils/src/**tests**/integration-cli-runner.test.ts†L40-L120】
- README/AGENT guidance now lists all active helpers and calls out that unused exports should be removed, helping future contributors keep the surface lean.【F:packages/e2e-utils/README.md†L73-L88】【F:packages/e2e-utils/AGENTS.md†L12-L24】

## Gaps & Opportunities

1. **Workspace runner timeout semantics.** We only assert that a timeout exits with `-1`; add coverage that confirms the child receives a `SIGTERM` and that stdout/stderr streams flush when the timeout fires.【F:packages/e2e-utils/src/integration/workspace.ts†L67-L125】【F:packages/e2e-utils/src/**tests**/integration-workspace.test.ts†L80-L118】
2. **CLI runner cwd + env precedence.** `createCliRunner()` resolves relative `cwd` values and merges `process.env` with overrides, but no tests assert the resolved working directory or that base env values from `process.env` survive when overrides are provided.【F:packages/e2e-utils/src/integration/cli-runner.ts†L13-L52】【F:packages/e2e-utils/src/**tests**/integration-cli-runner.test.ts†L8-L76】
3. **Manifest metadata diffs.** Current specs focus on added/removed/changed files but do not exercise permission or size changes; add a scenario where only mode/size changes trigger the `changed` bucket.【F:packages/e2e-utils/src/integration/fs-manifest.ts†L34-L74】【F:packages/e2e-utils/src/**tests**/integration-manifest.test.ts†L8-L40】
4. **Registry integration ergonomics.** The registry suite is exhaustive yet monolithic-extract helper functions for repeated `requestRaw/requestJson` flows and consider table-driven assertions for 404/405/500 permutations to ease future additions.【F:packages/e2e-utils/src/**tests**/integration-registry.test.ts†L1-L148】
5. **Helper failure smoke tests.** `runNodeSnippet()` is only covered for success; add a failure case (non-zero exit) to prove stderr aggregation matches CLI runner expectations.【F:packages/e2e-utils/src/test-support/cli-runner.test-support.ts†L1-L22】【F:packages/e2e-utils/src/**tests**/test-support.test.ts†L20-L38】

## Next Steps

- [ ] Add targeted tests for timeout signal handling and stream flush behaviour in `workspace.run()`.
- [ ] Extend CLI runner integration coverage to verify `cwd` resolution and env precedence rules.
- [ ] Add manifest diff coverage for permission/size-only changes.
- [ ] Refactor the registry suite helpers to reduce repetition while keeping assertions explicit.
- [ ] Cover error exits in `runNodeSnippet()` to guarantee parity with CLI runner diagnostics.
