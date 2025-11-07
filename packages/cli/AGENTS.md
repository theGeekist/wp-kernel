# `@wpkernel/cli` - Package Guide for Agents

The CLI package ships developer tooling for the framework. Use this guide alongside the root capabilities in `../../AGENTS.md`.

### Scope

Focus on scaffolding commands, code generation, and DX utilities. Keep the CLI aligned with the current architecture-templates should reflect `configureWPKernel()`, `WPKernelUIRuntime`, and config-object definitions.

### Build & Test

Run `pnpm --filter @wpkernel/cli test:coverage` before committing. If commands generate files, add fixture-based tests to ensure output stays in sync with framework conventions.
Run `pnpm --filter @wpkernel/cli typecheck:tests` after touching `.test-support.ts` helpers; they are excluded from the production build but must pass the tests TypeScript project.
Update snapshots with `pnpm --filter @wpkernel/cli test -u`.
Shared lint helper: use `tests/rule-tester.test-support.ts` to create configured ESLint `RuleTester` instances and canonical wpk config fixtures.
Command suites should import command contexts, reporter mocks, memory streams, and async flush helpers from `@wpkernel/test-utils/cli`, and use the `@wpkernel/test-utils/integration` workspace helpers (re-exported via `tests/workspace.test-support.ts`) instead of reimplementing streams, flush helpers, or temp directory setup.

Reuse the CLI transcript helpers from `@wpkernel/e2e-utils` when writing integration coverage; delete bespoke runners once tests migrate to the shared utilities.

### Conventions

Respect package boundaries: consume wpk APIs through public exports, never deep imports. When adding commands that touch documentation or specs, coordinate the updates so generated output references the latest guidance. Try to keep code and test files <=500 SLOC for ease of debugging and maintanence

Before starting work, review `docs/mvp-plan.md` and `docs/cli-migration-phases.md` for the current roadmap, success criteria, and task definitions.
When you close out any task from `docs/php-ast-migration-tasks.md` or `docs/pipeline-integration-tasks.md`, update the relevant completion notes and explicitly reaffirm that no string-based PHP generation was introduced while delivering the change.

Always import CLI exit codes and namespace constants from `@wpkernel/core/contracts` to ensure parity with the framework.

- Never add or wrap string-based generation in the CLI-emit AST (`PhpProgram`) or TypeScript output only.

### Versioning

- CLI tasks on the MVP board ship against the shared **v0.12.0** pre-1.0 line; plan your change sets so they trigger either a patch or minor bump for every package when merged.
- Update the CLI and root changelogs at the same time and link to the release checklist in `RELEASING.md` so the unified version stays in sync.
- Claim a version slot in `docs/mvp-plan.md` before you start and mark it complete (with PR link) once merged so parallel agents never collide on the same patch bump.
- Delay the actual version/changelog edits until your PR is approved and rebased; land the bump in the final commit right before merge so the ledger stays accurate and rebases stay light.

### Cross-package dependencies

When adjusting CLI dependencies (tsconfig paths, package references, builder wiring), follow `docs/guide/adding-workspace-dependencies.md` to keep shared workspace configuration aligned.
