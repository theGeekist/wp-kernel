# `@wpkernel/cli` – Package Guide for Agents

The CLI package ships developer tooling for the framework. Use this guide alongside the root policies in `../../AGENTS.md`.

### Scope

Focus on scaffolding commands, code generation, and DX utilities. Keep the CLI aligned with the current architecture-templates should reflect `configureKernel()`, `KernelUIRuntime`, and config-object definitions.

### Build & Test

Run `pnpm --filter @wpkernel/cli test:coverage` before committing. If commands generate files, add fixture-based tests to ensure output stays in sync with framework conventions.
Run `pnpm --filter @wpkernel/cli typecheck:tests` after touching `.test-support.ts` helpers; they are excluded from the production build but must pass the tests TypeScript project.
Shared lint helper: use `tests/rule-tester.test-support.ts` to create configured ESLint `RuleTester` instances and canonical kernel config fixtures.
Command suites should import the shared harnesses in `tests/cli-command.test-support.ts`, `tests/async.test-support.ts`, and `tests/workspace.test-support.ts` (via `createWorkspaceRunner`) instead of reimplementing streams, flush helpers, or temp directory setup.

### Conventions

Respect package boundaries: consume kernel APIs through public exports, never deep imports. When adding commands that touch documentation or specs, coordinate the updates so generated output references the latest guidance. Try to keep code and test files <=500 SLOC for ease of debugging and maintanence

Refer to `MVP-PHASES.md` in this package for the current roadmap, DoD, and testing expectations before extending the CLI.

Always import CLI exit codes and namespace constants from `@wpkernel/core/contracts` to ensure parity with the framework.
