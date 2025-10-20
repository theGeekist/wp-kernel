# `@wpkernel/cli` – Package Guide for Agents

The CLI package ships developer tooling for the framework. Use this guide alongside the root policies in `../../AGENTS.md`.

### Scope

Focus on scaffolding commands, code generation, and DX utilities. Keep the CLI aligned with the current architecture-templates should reflect `configureKernel()`, `KernelUIRuntime`, and config-object definitions.

### Build & Test

Run `pnpm --filter @wpkernel/cli test:coverage` before committing. If commands generate files, add fixture-based tests to ensure output stays in sync with framework conventions.
Run `pnpm --filter @wpkernel/cli typecheck:tests` after touching `.test-support.ts` helpers; they are excluded from the production build but must pass the tests TypeScript project.
Shared lint helper: use `tests/rule-tester.test-support.ts` to create configured ESLint `RuleTester` instances and canonical kernel config fixtures.
Command suites should import command contexts, reporter mocks, memory streams, and async flush helpers from `@wpkernel/test-utils/cli`, and use the `@wpkernel/test-utils/integration` workspace helpers (re-exported via `tests/workspace.test-support.ts`) instead of reimplementing streams, flush helpers, or temp directory setup.

Reuse the CLI transcript helpers from `@wpkernel/e2e-utils` when writing integration coverage; delete bespoke runners once tests migrate to the shared utilities.

### Conventions

Respect package boundaries: consume kernel APIs through public exports, never deep imports. When adding commands that touch documentation or specs, coordinate the updates so generated output references the latest guidance. Try to keep code and test files <=500 SLOC for ease of debugging and maintanence

Refer to `MVP-PHASES.md` in this package for the current roadmap, DoD, and testing expectations before extending the CLI.
When you close out any phase from `docs/next-php-ast-parity-phases.md`, update the corresponding completion summary in that document within the same change.

Always import CLI exit codes and namespace constants from `@wpkernel/core/contracts` to ensure parity with the framework.
