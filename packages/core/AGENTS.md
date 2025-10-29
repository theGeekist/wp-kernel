# `@wpkernel/core` - Package Guide for Agents

This package is the runtime heart of WP Kernel. Changes here affect every consumer, so follow the root capabilities in `../../AGENTS.md` and the guidelines below.

### Scope

Work in this package focuses on resources, actions, capabilities, registry integration, reporter infrastructure, and the new `configureWPKernel()` bootstrap. When altering public APIs, update the companion specs (`configureWPKernel - Specification.md`, `Architecture Cohesion Proposal.md`) first, then mirror the changes in code and documentation.

### Build & Test

Run `pnpm --filter @wpkernel/core test` after edits, followed by `pnpm typecheck` and `pnpm typecheck:tests`. When modifying transport or registry code, run the showcase Playwright suite to ensure end-to-end flows remain stable.

Shared test helpers now live in `@wpkernel/test-utils/core`:

- Import WordPress harness utilities (`createWordPressTestHarness`, `withWordPressData`, `createApiFetchHarness`) from the shared package so suites stop depending on relative paths.
- Use `applyActionRuntimeOverrides` / `withActionRuntimeOverrides` from the same entry point when you need to mutate `__WP_KERNEL_ACTION_RUNTIME__` in tests.
- Continue sourcing raw globals from `@wpkernel/test-utils/wp` when you need to assert against the base harness.

`*.test-support.ts` helpers are excluded from the published build; run `pnpm --filter @wpkernel/core typecheck:tests` after touching them to keep the tests project in sync.

### Conventions

Maintain namespace and event naming consistency-use helpers from `namespace/` and publish lifecycle updates via the typed event bus. Throw `WPKernelError` or an existing subclass (`TransportError`, `ServerError`, etc.); when introducing new errors, derive from `WPKernelError` so behaviour remains consistent. Keep exports surface-driven: no deep imports from `src/**` in other packages.

Always source namespaces, lifecycle phases, and exit codes from `@wpkernel/core/contracts` to avoid drift.

### Cross-package dependencies

Coordinate any cross-package dependency updates (tsconfig references, package manifests, shared builders) with the guidance in `docs/guide/adding-workspace-dependencies.md` so downstream packages stay coherent.

### Versioning

- Core tracks the unified **v0.9.x** pre-1.0 version with the rest of the monorepo. Any change that alters the public surface should be bundled with a patch or minor bump across every package.
- Record the bump in the package and root changelogs and verify the release steps in `RELEASING.md` before requesting review.
