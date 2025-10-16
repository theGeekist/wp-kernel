# Unit Test Audit & Improvement Plan

## Key Observations

- Current coverage is limited to config surfacing and the version export; there are no assertions around command parsing, project scaffolding, or error handling pathways.【F:packages/cli/src/**tests**/bundler-config.test.ts†L1-L31】【F:packages/cli/src/**tests**/version.test.ts†L1-L8】
- ESLint rule suites re-create `RuleTester` instances, parser configuration, and shared source headers for every rule grouping, leading to verbose fixtures that are difficult to extend consistently.【F:packages/cli/**tests**/eslint-rules/kernel-config-rules.test.ts†L1-L125】
- Tests rely on inline template strings for generated config files, so real template drift or CLI output regressions are not automatically caught.

## Actionable Improvements

1. Add integration-style tests that execute `bin/wpkernel` (or the command entry point) against temporary workspaces using the existing filesystem helpers from `@wpkernel/e2e-utils`, exercising scaffold commands, failure cases, and help output.
2. Extract a `createRuleTester()` utility that centralises parser options and shared fixtures, letting individual rule suites import canonical config snippets and reduce duplication.【F:packages/cli/**tests**/eslint-rules/kernel-config-rules.test.ts†L1-L125】
3. Introduce golden-file assertions for generated artifacts (e.g., kernel config, resource templates) stored under `__fixtures__`, so tests can diff actual CLI output against expected snapshots instead of reproducing templates inline.
4. Expand coverage for configuration adapters and printers by mocking I/O boundaries (e.g., `fs`, `execa`) to verify user-facing messages and error conditions beyond simple existence checks.
