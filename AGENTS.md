# AGENTS.md - wpk CLI

## Scope & Precedence

This document provides operational guidance for coding agents (Codex, etc.) working on the wpk CLI. Follow the commands and constraints below. Complete tasks only when checks are green and diffs are minimal. For task-specific context, always consult `packages/cli/docs/index.md` (Docs Index) and the [MVP Plan](packages/cli/docs/mvp-plan.md) before coding.

## Project Architecture & Invariants

- Rails-like WordPress framework: **JS is source of truth**; PHP acts as a thin transport and capability bridge.
- Core primitives: Actions (handle writes), Resources (transport, stores, cache keys, events), Views (blocks, bindings, Interactivity API), Jobs (background).
- Non-negotiables:
    - UI never calls transport directly; **all writes flow through Actions**.
    - Use only **canonical registry event names**; no ad-hoc events.
    - Errors must be typed `KernelError` subclasses; never throw plain `Error`.
    - Lifecycle phases, namespaces, and CLI exit codes come from `@wpkernel/core/contracts`-never inline the kernel namespace or exit code numbers.
    - **CLI rule:** All generation work happens in `packages/cli/src/next/**`. Do not introduce or wrap string-based printers-emit AST (`PhpProgram`) or TypeScript outputs only.

## Project Structure & Module Organisation

- The repo is a monorepo with multiple packages under `packages/` and example plugins under `examples/`.
- Each package uses `src/` for source code, `tests/` for tests, and `types/` for TypeScript definitions.
- Modules have clear separation of concerns and minimal cross-package dependencies.
- Avoid deep imports across packages (e.g., no direct imports from `packages/*/src/**`).
- Use explicit exports and imports to maintain encapsulation and module boundaries.
- When updating CLI docs or planning work, keep `packages/cli/docs/index.md` and `packages/cli/docs/mvp-plan.md` in sync.

## Environment & Tooling

- Node v20.x LTS or higher (required for Vite 7).
- WordPress 6.7+ (Script Modules API required).
- Development environments: `wp-env` (Docker + PHP 8.1+) or WordPress Playground (WASM, no Docker).
- E2E testing is optional; uses Playwright and `@wpkernel/e2e-utils`.
- Commands:
  **NOTE the correct usage of the `--filter` flag is to always precede it with `pnpm`**
  `pnpm build|test|lint --filter <workspace>` = WRONG
  `pnpm --filter <workspace> build|test|lint` = CORRECT
    - Install: `pnpm install`
    - Format/lint: `pnpm lint --fix` and `pnpm format`
    - Typecheck code: `pnpm typecheck`
    - Typecheck tests: `pnpm typecheck:tests`
    - Test all: `pnpm test` (do not use `--filter`)
    - Build: `pnpm build` (if needed)
- We have `types/globals.d.ts`, `tests/test-globals.d.ts`, and the shared `@wpkernel/test-utils/wp` entry point (legacy alias: `tests/test-utils/wp.test-support.ts` via `tests/test-utils/wp.ts`). Package harnesses extend this surface in:
    - `@wpkernel/test-utils/core`
    - `packages/cli/tests/rule-tester.test-support.ts`
    - `@wpkernel/test-utils/ui` (pass the package `KernelUIProvider`) + `packages/ui/tests/dom-observer.test-support.ts`
    - `packages/e2e-utils/src/test-support/*.test-support.ts`
      Workspace helpers now live in `@wpkernel/test-utils/integration`; CLI suites re-export them from `packages/cli/tests/workspace.test-support.ts` until all consumers flip to the shared package.
      Helpers follow the `.test-support.ts` suffix, ship colocated unit tests, are excluded from production builds, and are type-checked via `pnpm --filter <pkg> typecheck:tests`. Update the relevant `AGENTS.md`/README/doc entries when new helpers are added.
- When running agents (Codex, Co-Pilot, etc.) inside private containers or CI, set `CI=1` before running any `git` commands to ensure non-interactive behavior.
- The pre-commit hook will take some time. PLease allow it to finish!

## E2E Testing with wp playground

**For your CI/cloud container after `pnpm install`, run:**

```bash
pnpm playground:offline         # Starts server in background on port 9400
pnpm playground:offline:stop    # Stops server in background (zero network)
```

**It mounts the showcase app so we can test it with playwrite**

## Quality & Coverage

- Maintain ≥95% statements/lines and ≥98% functions coverage globally.
- Branch coverage median ≥90% (some file-level dips allowed if global median holds).
- Keep core modules (error, http, resource) near 100% coverage.
- Defensive branches that are hard to reach are acceptable if documented.
- Avoid flaky tests; use serial mode or improved selectors/cleanup instead of sleeps.

## File Size Guidelines

- **Target**: Keep individual code and test files under **500 lines** (SLOC - source lines of code).
- **Guideline**: This is a maintainability target to aid debugging and comprehension
- **When approaching 500 lines**, consider:
    - Extracting shared utilities or helper functions
    - Splitting related concerns into focused modules
    - De-duplicating repeated patterns

## Workflow & Policies

- Before starting any task, read the linked documentation in the MVP plan and restate the scope (“Evaluate Task …”). Clarify uncertainties before writing code.
- All CLI work must keep the AST-first pipeline intact. Do **not** wrap or call the old string-based printers (`packages/cli/src/printers/php/**`, `packages/cli/src/printers/blocks/**`).
- Definition of Done (DoD):
    - Pass `pnpm typecheck` and `pnpm typecheck:tests`.
    - Pass `pnpm test` with no coverage regression.
    - Test new public APIs and error paths.
    - No `any` types introduced; update globals if needed.
    - Follow folder conventions.
- Always run before requesting review:
  `pnpm lint --fix && pnpm typecheck && pnpm typecheck:tests && pnpm test`

## Commit & PR Guidelines

**IMPORTANT!! NEVER `git commit --no-verify`! JUST BE PATIENT AND WAIT!!**

- Make small, focused commits (one concern per commit).
- Always use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`).
- PR title format: task headline from the MVP plan (e.g., "Task 5: Block Builder AST implementation").
- Link to Roadmap section and Sprint doc/spec in PR description.
- Respond to all review feedback; avoid duplication; extract interfaces when suggested.

## Agent Execution Policy (Codex)

- Default to read/write in workspace.
- Ask before:
    - Writing outside workspace, changing dotfiles, or enabling network access.
    - Installing new dev dependencies.
    - Creating or modifying PRs (always use PR template).
- Never run destructive commands, alter Git history, or publish artifacts.
- Always show plan, then diffs, then run checks. Close task only after DoD passes.

## Docs & Spec Coordination

- Always update `/docs`, `CHANGELOG.md`, `README.md` and if needed `MIGRATION.md`. Keep `packages/cli/docs/index.md`, `packages/cli/docs/cli-migration-phases.md`, `packages/cli/docs/mvp-plan.md`, and related task docs in sync with code changes.
- For documentation-only work, see `docs/AGENTS.md`; mention affected pages in PR descriptions to avoid drift.

## What NOT to do

- `pnpm COMMAND --filter`: WRONG, `pnpm --filter ... COMMAND`: CORRECT
- Call transport from UI components.
- Create ad-hoc event names.
- Deep-import across packages (`packages/*/src/**`).
- Use `any` or throw plain `Error`.
- Skip cache invalidation after writes.
- Ignore TypeScript errors or coverage regressions.
- git commit --no-verify

## Versioning

- Current release train: **v0.6.x (pre-1.0)**. All publishable packages share the same semantic version sourced from the root `package.json`.
- When you complete any scoped task in `packages/cli/docs/mvp-plan.md`, plan the work so the unified version bumps by either a patch (fix-level) or minor (feature-level) increment. Do the code/tests first, then-once approvals land and you rebased-apply the version/CHANGELOG updates in a final commit before merge.
- Document migrations and changelog entries as pre-1.0 guidance; do not reference 1.x semantics until the roadmap flips to RC.
- If you introduce a new public surface, call out the required version bump in the PR template and confirm the release checklist in `RELEASING.md` is satisfied.
- Respect the reserved version ledger in `packages/cli/docs/mvp-plan.md`; claim your slot before you start and update it (with PR link) once merged so parallel agents do not reuse patch numbers.

## Cross-package dependencies

Before changing workspace dependency wiring (TypeScript paths, project references, package manifests), consult `docs/guide/adding-workspace-dependencies.md` and follow its checklist so sibling packages stay in sync.
