# Testing Guide

Testing in WPKernel leans on shared helpers, strict coverage targets, and predictable tooling so extending suites feels frictionless.

## Commands to run before shipping

Run the contributor commands before you open a pull request:

- `pnpm lint --fix`
- `pnpm typecheck`
- `pnpm typecheck:tests` (validates all `*.test-support.ts` helpers)
- `pnpm test:coverage`

These commands surface lint, type, or coverage regressions early and mirror the pre-commit hook.

## Shared helper catalogue

Use the canonical helpers instead of inventing package-local mocks:

- `@wpkernel/test-utils/wp` - WordPress globals, namespace resetters, and environment shims (still re-exported via `tests/test-utils/wp.test-support.ts` for backwards compatibility).
- `tests/TEST_PATTERNS.md` - Reference playbook covering setup, teardown, naming, and when to extend the shared helpers.
- `@wpkernel/test-utils/core` - `createWordPressTestHarness()` plus scoped overrides like `applyActionRuntimeOverrides()` for reliable `window.wp` bootstrapping.
- `packages/cli/tests/rule-tester.test-support.ts` - ESLint `RuleTester` factory plus config fixture builders.
- `@wpkernel/test-utils/ui` - Kernel UI provider + runtime harness, console guards, and registry reset helpers (pass `WPKernelUIProvider`).
- `packages/ui/tests/dom-observer.test-support.ts` - `IntersectionObserver`/`requestAnimationFrame` mocks with shared teardown.
- `@wpkernel/test-utils/integration` - Workspace lifecycle helpers (`withWorkspace`, `createWorkspaceRunner`) shared across CLI and integration suites.
- `packages/e2e-utils/src/test-support/cli-runner.test-support.ts` - `runNodeSnippet()` for capturing CLI transcripts in tests.

Each helper ships with colocated unit tests so adopting them improves, not dilutes, coverage.

## Naming & coverage conventions

Suffix all shared helpers with `.test-support.ts`, keep them out of production builds via the package `tsconfig.json`, and type-check them through the tests project. Helpers without self-tests are rejected because they drag coverage below the monorepo requirement (≥95% statements/lines, ≥98% functions, ≥90% branch median). Update the relevant `AGENTS.md`, package README, and docs whenever you introduce a new helper so other teams can discover it quickly.

## Working with helpers

Prefer importing helpers from the package barrels instead of deep imports. For example, UI suites should call `createWPKernelUITestHarness()` to obtain providers and registry resetters, while CLI rule suites should instantiate `createRuleTester()` for ESLint coverage. When you need bespoke behaviour, extend the shared helpers or add new functions beside them so future work benefits from your additions.

## Extending the catalogue

When adding a helper:

1. Implement it in the nearest `*.test-support.ts` module.
2. Add a focused unit test under the package’s `tests/__tests__/` (or `src/__tests__/` for e2e-utils).
3. Run `pnpm --filter <package> typecheck:tests` to ensure the helper participates in the tests TypeScript project.
4. Update the package `AGENTS.md`, README, and the root `AGENTS.md` bullet list.

This flow keeps the catalogue discoverable and avoids duplicate effort across teams.

## Additional resources

- `tests/TEST_PATTERNS.md` - canonical examples and escalation paths.
- [E2E Testing Guide](./e2e-testing.md) - for end-to-end testing with Playwright.
- Package READMEs - quick reminder of helper entry points per package.
- `/docs/packages/*` - lightweight overviews linking to helper docs and API reference pages.
