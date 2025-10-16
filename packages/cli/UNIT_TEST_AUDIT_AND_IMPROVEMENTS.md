# Unit Test Audit & Improvement Plan

## Key Observations

- Current coverage is limited to config surfacing and the version export; there are no assertions around command parsing, project scaffolding, or error handling pathways.【F:packages/cli/src/**tests**/bundler-config.test.ts†L1-L31】【F:packages/cli/src/**tests**/version.test.ts†L1-L8】
- ESLint rule suites re-create `RuleTester` instances, parser configuration, and shared source headers for every rule grouping, leading to verbose fixtures that are difficult to extend consistently even though we already document reusable setup expectations in `tests/TEST_PATTERNS.md` and support reuse via the shared `tests/test-utils/wp.test-support.ts` exports.【F:packages/cli/**tests**/eslint-rules/kernel-config-rules.test.ts†L1-L125】【F:tests/TEST_PATTERNS.md†L78-L122】【F:tests/test-utils/wp.test-support.ts†L1-L115】
- Tests rely on inline template strings for generated config files, so real template drift or CLI output regressions are not automatically caught.

## Actionable Improvements

1. Add integration-style tests that execute `bin/wpkernel` (or the command entry point) against temporary workspaces using the existing filesystem helpers from `@wpkernel/e2e-utils`, exercising scaffold commands, failure cases, and help output.
2. Extract a `createRuleTester()` utility in `tests/rule-tester.test-support.ts` that centralises parser options and shared fixtures, letting individual rule suites import canonical config snippets and reduce duplication. Document the helper in `packages/cli/AGENTS.md` and keep compatibility exports until suites migrate.【F:packages/cli/**tests**/eslint-rules/kernel-config-rules.test.ts†L1-L125】
3. Introduce golden-file assertions for generated artifacts (e.g., kernel config, resource templates) stored under `__fixtures__`, so tests can diff actual CLI output against expected snapshots instead of reproducing templates inline. Helpers that write files must include dedicated unit tests so package coverage is unaffected.
4. Expand coverage for configuration adapters and printers by mocking I/O boundaries (e.g., `fs`, `execa`) to verify user-facing messages and error conditions beyond simple existence checks.
5. Consolidate helper naming by suffixing new utilities with `.test-support.ts`, re-exporting them (if necessary) through a barrel, and documenting availability in `AGENTS.md`/`README.md`. Encourage reuse by referencing the shared globals in `tests/TEST_PATTERNS.md` and adding self-tests (e.g., `tests/__tests__/rule-tester.test.ts`) for any new helper to keep coverage high.【F:tests/TEST_PATTERNS.md†L1-L122】【F:packages/cli/tests/**tests**/rule-tester.test.ts†L1-L140】
