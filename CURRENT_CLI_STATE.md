# WP Kernel - Current State (v2)

**Last Updated:** 10 October 2025  
**Version:** 0.3.0 (monorepo snapshot)  
**Status:** Core runtime stable; CLI roadmap phases 0–6 landed (5C/7/7a/8 pending)

---

## Quick Orientation

- WP Kernel is a JavaScript-first WordPress framework: UI talks to resources and actions, transport access stays inside the kernel, and every failure is expressed as a typed `KernelError`.
- The architecture overhaul for the core runtime, UI bindings, and showcase plugin is complete. The CLI now ships the full config → IR → printers → apply → watch workflow across Phases 0–6.
- Completed CLI phases: Baseline audit, config loader & validation, deterministic IR, type & PHP printers, `wpk generate`, guarded apply, apply safety & logging, and `wpk dev` watch mode.
- Pending work (tracked in `packages/cli/PHASES.md`): Phase 5C (PHP printer DX upgrade), Phase 7/7a (adapter slots + recipe tooling), and Phase 8 (documentation/adoption sweep).

### Packages at a Glance

| Package                        | Role               | Highlights                                                                                                                                                                                                                                |
| ------------------------------ | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@geekist/wp-kernel`           | Core runtime       | `configureKernel`, `defineResource`, `defineAction`, `definePolicy`, typed `KernelEventBus`, canonical `wpk.*` events, cache helpers, namespace utilities, `KernelError` family                                                           |
| `@geekist/wp-kernel-ui`        | React adapter      | `attachUIBindings`, `<KernelUIProvider>`, `useAction`, `usePolicy`, resource `useGet`/`useList`, prefetch helpers; subscribes to runtime events instead of globals                                                                        |
| `@geekist/wp-kernel-cli`       | Authoring workflow | `loadKernelConfig` (cosmiconfig + Typanion), deterministic IR builder, printers for TS types & guarded PHP, `FileWriter` with SHA-256 dedupe, adapter extension runner, commands `generate`, `apply`, `dev`; `init`/`doctor` placeholders |
| `@geekist/wp-kernel-e2e-utils` | Playwright helpers | Boots kernel-aware fixtures for showcase and downstream tests                                                                                                                                                                             |
| `app/showcase`                 | Reference plugin   | Demonstrates resources/actions/policies, consumes CLI codegen, and uses guarded apply to keep manual PHP outside AUTO blocks                                                                                                              |

---

## CLI Pipeline (Phases 0–6)

| Phase                          | Delivered                                                                                                                                                         | Key Outputs                                                                                                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 – Baseline Audit             | Gap analysis between showcase config and `KernelConfigV1`; composer autoload sanity check                                                                         | Findings captured in `packages/cli/docs/phase-0-baseline-audit.md` and status log                                                                     |
| 1 – Config Loader & Validation | `loadKernelConfig` resolves TS/JS/JSON/`package.json#wpk`, normalises namespace, validates via Typanion, checks composer PSR-4 target, emits reporter diagnostics | Returns `{ config, sourcePath, configOrigin, composerCheck, namespace }` with typed `KernelError` failures                                            |
| 2 – IR Construction            | `buildIr` produces deterministic `IRv1` (sanitised namespace, schema hashes, identity/storage metadata, policy hints) and rejects duplicate/reserved routes       | Synthesises schemas for `storage: 'auto'`; IR records provenance and output directory defaults                                                        |
| 3 – Printer Foundation         | TypeScript and PHP printers targeting `.generated/types/**` & `.generated/php/**`; REST args arrays, persistence registries, controllers with guard markers       | Adapter `customise` hooks run before Prettier formatting; `.generated/types/index.d.ts` aggregated automatically                                      |
| 4 – `wpk generate`             | Clipanion command wrapping loader → IR → printers with content-hash-aware `FileWriter` and reporter summary                                                       | Options: `--dry-run`, `--verbose`; exit codes `0` success, `1` validation/developer error, `2` printer/runtime failure, `3` adapter extension failure |
| 5A – Guarded Apply             | `wpk apply` copies `.generated/php/**` into `inc/**`, merging only `WPK:BEGIN/END AUTO` sections and reporting `created/updated/skipped`                          | Reporter summaries and tests ensure manual code outside guards is preserved                                                                           |
| 5B – Apply Safety & Logging    | Clean-state enforcement (git porcelain), `--yes` override, `--backup`, `--force`, `.wpk-apply.log` JSONL audit, exit codes `0/1/2`                                | Errors surface as `KernelError`; log entries capture timestamp, flags, summary, per-file metadata, and backup paths                                   |
| 6 – Watch Mode                 | `wpk dev` chokidar watcher with fast/slow debounce tiers, initial run, queued triggers, optional `--auto-apply-php` copy step, structured reporter output         | Ignores `.git`, `node_modules`, `.generated`, `build`; handles SIGINT/SIGTERM gracefully and continues after generation warnings                      |

### Adapter Extensions

- `adapter.extensions` factories run inside sandbox directories with deterministic ordering.
- `runAdapterExtensions` queues writes, allows IR mutations, and commits atomically; failures roll back and cause `wpk generate` to exit with code 3.
- Extensions are constrained to `.generated/**`; attempts to write elsewhere raise errors before anything hits disk.

---

## CLI Commands Snapshot

- `wpk generate [--dry-run] [--verbose]` → runs the full pipeline, prints a summary table, and writes `.generated/**` using SHA-256 dedupe.
- `wpk apply [--yes] [--backup] [--force]` → enforces clean `.generated/php`, writes backups when requested, logs every run to `.wpk-apply.log`, and never overwrites manual code outside guard sections without `--force`.
- `wpk dev [--verbose] [--auto-apply-php]` → watches config/resources/schemas/blocks, coalesces triggers, and reuses the generation pipeline; optional PHP auto-apply performs a best-effort `fs.cp`.
- `wpk init [--name] [--template]` → stub that prints invocation details; scaffolding will arrive after adapter slot/recipe work.
- `wpk doctor` → stub reporting placeholder diagnostics; real environment checks are scheduled for Phase 8.

---

## Core Runtime Highlights

- `configureKernel()` remains the unified bootstrap, wiring registry middleware, the events bridge, optional UI runtime, and teardown helpers. Namespace defaults come from detection utilities but can be overridden explicitly.
- `defineResource`, `defineAction`, and `definePolicy` use config objects and emit canonical `wpk.*` events via `KernelEventBus`; the bus mirrors into `wp.hooks` through `kernelEventsPlugin`.
- Cache helpers (`invalidate`, `invalidateAll`, `normalizeCacheKey`, `matchesCacheKey`, `findMatchingKeys*`) power UI hooks and action contexts.
- All runtime and CLI failures flow through the `KernelError` hierarchy; no plain `Error` escapes.
- `globalThis.getWPData` provides a safe shim for `window.wp.data`, keeping server-side rendering and tests from crashing when WordPress globals are absent.

### UI Integration (`@geekist/wp-kernel-ui`)

- `attachUIBindings` listens for `resource:defined` events and decorates resources with `useGet`/`useList`.
- `<KernelUIProvider>` plus hooks (`useAction`, `usePolicy`, prefetch helpers) derive state from the runtime instead of mutable globals.
- Policy runtime reads from `globalThis.__WP_KERNEL_ACTION_RUNTIME__` when present, keeping capability decisions consistent between JS and PHP.

---

## Developer Workflow (Happy Path)

1. Update `kernel.config.ts`, schemas, or resources.
2. Run `pnpm --filter @geekist/wp-kernel-cli build` after installing/upgrading dependencies (vite + tsc).
3. Execute `wpk generate` → review the `FileWriter` summary and diff `.generated/**`.
4. Commit `.generated/**` (required before applying).
5. Run `wpk apply` with backups as needed → inspect `.wpk-apply.log`.
6. Optionally run `wpk dev` during active work for continuous regeneration.
7. Before merging: `pnpm lint --fix && pnpm typecheck && pnpm typecheck:tests && pnpm test`.
8. Showcase plugin (`app/showcase`) stays in sync by running `wpk generate && wpk apply`; custom PHP lives outside guard rails.

---

## Safety, Logging & Diagnostics

- Every CLI validation failure raises a typed `KernelError`; reporter output is namespaced (`wpk.cli.*`) for easy filtering.
- `FileWriter` uses SHA-256 hashes, guarantees trailing newlines, and records `written/unchanged/skipped` counts; dry-run mode tags entries with `reason: 'dry-run'`.
- `.wpk-apply.log` is append-only JSONL storing timestamp, flags, summary, and per-file details (including backup paths or forced overwrites).
- Watch mode auto-applies PHP only when explicitly opted in and logs failures without aborting the watcher.
- Adapter extensions cannot write outside `.generated/**`; sandboxed output is committed only when all extensions succeed.

---

## Showcase & Testing Snapshot

- Showcase plugin demonstrates generated controllers, REST args, persistence registration, and policy enforcement driven by CLI artifacts.
- CLI package maintains ≥ 89 % branch coverage with golden fixtures for IR JSON, generated TypeScript, and generated PHP.
- `@geekist/wp-kernel-e2e-utils` provides kernel-aware Playwright fixtures, ensuring generated artifacts and runtime integrations remain interoperable.

---

## Upcoming Focus

- **Phase 5C:** Replace PHP `json_decode` payloads with native arrays and refresh fixtures/docs.
- **Phase 7 / 7a:** Ship adapter recipe/slot system, PHP analyser, and adapter scaffolding/test commands.
- **Phase 8:** Complete documentation/migration guides and add showcase “golden run” CI automation.
- **Doctor / Init:** Upgrade the placeholder commands once adapter work lands (real health checks + scaffolding).

---

**Document Version:** 2.1  
**Generated:** 10 October 2025
