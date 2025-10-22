## Purpose & Context

This app is a **real-world WordPress plugin demo** designed to exercise WP Kernel. It is serves to validate features, integration flows, and alignment with the Example Plugin Specifications.

## Role in the Monorepo

Provides **proof of concept** for new kernel features as they are developed.

- Validates `@wpkernel/core` and `@wpkernel/cli` in plugin development
- Validates `@wpkernel/e2e-utils` in a real browser/e2e context.
- Mirrors the **Example Plugin Requirements** and **Specifications** (symlinked from Obsidian), which serve as the _source of truth_ for intended plugin behavior.

## Environment & Tooling

- Depends directly on `@wpkernel/core` and `@wpkernel/ui` (`workspace:*`).
- Dev-only dependency: `@wpkernel/e2e-utils` for end-to-end testing.
- Dev-only tooling: `@wpkernel/cli`
- Seeds (`./seeds/*.sh`) bootstrap jobs, users, media, and content. Run these to reset to a clean demo dataset.

## Definition of Done

- [ ] **Spec alignment**: All new or changed flows must match the Example Plugin Specifications.
- [ ] **Kernel integration**:
    - Must use `cli` wiring (init, generate, apply) from the framework
    - Showcase can and should freely patch itself (resources, actions, views, seeds, admin screens).
    - Kernel-level gaps (new primitives, type fixes, error handling, cache rules, etc.) must be fixed in the kernel package and then consumed by showcase.
    - Follow the rule of thumb: _generic, reusable logic belongs in kernel; business/domain logic belongs in showcase_.
    - New generic primitives (e.g., store invalidation, resource resolver, error types) should be implemented in `@wpkernel/core` and consumed here to avoid duplicating transport or event logic in PHP.
- [ ] **E2E validation**:
    - In CI, e2e uses `pnpm playground:start` and `pnpm playground:stop` to set up `wp playground`.
    - playwright is already installed with `--chromium` and is the only browser we check (run e2e with --project chromium)
    - All showcase flows (public + admin) must pass.
- [ ] **Seeds updated** if new data requirements arise.
- [ ] **No hidden kernel logic**-do not let framework fixes live only in showcase.

## Generated Artifacts Policy

- All files emitted by `wpk init`, `wpk generate`, and `wpk apply` **must be committed** in this repository.
- Regenerate and re-apply after dependency bumps (e.g. `@wpkernel/core`, `@wpkernel/ui`) to surface drift. Commit the resulting diffs so CI can spot printer/scaffold regressions.

## Patterns

- Prefer using block.json `viewScriptModule`/`editorScriptModule` for mounting wherever possible.
- Enqueue scripts via PHP only when a screen or route cannot be block-mounted (e.g., custom admin pages).

- Keep `inc/` for PHP bridge code; keep PHP thin (REST controllers + wiring).
- Build artifacts (`build/`, `dist-tests/`) should never be hand-edited.

## Tests

- Showcase includes two kinds of tests:
    - `__tests__/e2e/` - full browser-driven flows.
    - `__tests__/build-verification/` - ensures build outputs load correctly.
- Coverage is less critical than in kernel, but **all major flows** (job listing, application, admin pipeline) must be tested end-to-end.
- `dist-tests/` contains generated/compiled test output and should not be edited manually.

## What NOT to do

- ✗ Hide framework fixes inside showcase (upstream them to kernel).
- ✗ Break alignment with Example Plugin Requirements/Specifications.
- ✗ Commit symlinked docs (they live outside the repo; only symlinks).
- ✗ Rely on showcase for unit tests-kernel coverage belongs in `packages/core`.

## Agent Policy

Use showcase to **prove and pressure-test** kernel features. When gaps are discovered, fix them upstream. Showcase is the **integration battlefield**, not a side-channel fork of the framework.

## Cross-package dependencies

When regenerating showcase assets that depend on workspace packages, verify configuration changes against `docs/guide/adding-workspace-dependencies.md` so the demo continues to reflect the canonical wiring.
