# `@wpkernel/core` – Package Guide for Agents

This package is the runtime heart of WP Kernel. Changes here affect every consumer, so follow the root policies in `../../AGENTS.md` and the guidelines below.

### Scope

Work in this package focuses on resources, actions, policies, registry integration, reporter infrastructure, and the new `configureKernel()` bootstrap. When altering public APIs, update the companion specs (`configureKernel - Specification.md`, `Architecture Cohesion Proposal.md`) first, then mirror the changes in code and documentation.

### Build & Test

Run `pnpm --filter @wpkernel/core test` after edits, followed by `pnpm typecheck` and `pnpm typecheck:tests`. When modifying transport or registry code, run the showcase Playwright suite to ensure end-to-end flows remain stable.

Shared test helpers live under `tests/*.test-support.ts`:

- `tests/wp-environment.test-support.ts` - install/reset WordPress globals via `createWordPressTestHarness()`.
- `tests/action-runtime.test-support.ts` - scoped helpers for overriding `__WP_KERNEL_ACTION_RUNTIME__`.

### Conventions

Maintain namespace and event naming consistency-use helpers from `namespace/` and publish lifecycle updates via the typed event bus. Throw `KernelError` or an existing subclass (`TransportError`, `ServerError`, etc.); when introducing new errors, derive from `KernelError` so behaviour remains consistent. Keep exports surface-driven: no deep imports from `src/**` in other packages.

Always source namespaces, lifecycle phases, and exit codes from `@wpkernel/core/contracts` to avoid drift.
