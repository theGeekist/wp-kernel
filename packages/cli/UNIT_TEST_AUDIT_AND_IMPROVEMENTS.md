# Unit Test Audit & Improvement Plan

## Key Observations

- Current coverage is limited to config surfacing and the version export; there are no assertions around command parsing, project scaffolding, or error handling pathways.【F:packages/cli/src/**tests**/bundler-config.test.ts†L1-L31】【F:packages/cli/src/**tests**/version.test.ts†L1-L8】
- ESLint rule suites re-create `RuleTester` instances, parser configuration, and shared source headers for every rule grouping, leading to verbose fixtures that are difficult to extend consistently even though we already document reusable setup expectations in `tests/TEST_PATTERNS.md` and support reuse via the shared `tests/test-utils/wp.test-support.ts` exports.【F:packages/cli/**tests**/eslint-rules/kernel-config-rules.test.ts†L1-L125】【F:tests/TEST_PATTERNS.md†L78-L122】【F:tests/test-utils/wp.test-support.ts†L1-L115】
- Tests rely on inline template strings for generated config files, so real template drift or CLI output regressions are not automatically caught.

## Actionable Improvements

- [ ] **Workspace-level CLI integration tests.** Execute `bin/wpkernel` against isolated temp workspaces (leveraging `@wpkernel/e2e-utils`) to assert scaffold flows, help output, and failure messaging end-to-end.
- [x] **Rule tester helper extracted.** `tests/rule-tester.test-support.ts` centralises ESLint parser options plus fixture builders, ships self-tests, and is documented in the AGENT/README for discoverability.【F:packages/cli/tests/rule-tester.test-support.ts†L1-L105】【F:packages/cli/tests/**tests**/rule-tester.test.ts†L1-L40】【F:packages/cli/AGENTS.md†L12-L16】【F:packages/cli/README.md†L44-L48】
- [ ] **Golden-file assertions for generators.** Store CLI output expectations under `__fixtures__` and assert against actual command output to surface template drift early.
- [ ] **Printer and adapter coverage.** Mock I/O boundaries (`fs`, `execa`) to validate messaging and error paths across printers and adapters beyond simple existence checks.
- [x] **Consistent helper naming & docs.** `.test-support.ts` naming is enforced for new utilities, with guidance published alongside links back to `tests/TEST_PATTERNS.md` to keep imports consistent across packages.【F:packages/cli/tests/rule-tester.test-support.ts†L1-L105】【F:tests/TEST_PATTERNS.md†L1-L122】
