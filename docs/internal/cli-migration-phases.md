# Next-Gen CLI - Contributor Brief

_See [Docs Index](cli-index.md) for navigation._

Status: **Phases 0-6 shipped (pipeline alignment complete)**
Version train: **v0.10.x (pre-1.0)**
Scope: `packages/cli/src/**`  
Audience: maintainers and contributors working on the wpk helper-first pipeline (`packages/cli/src/**`).

This document replaces earlier drafts (`next-cli.md.audit-backup`, `next-cli.md.orig`). All relevant context from those files now lives here.

---

## Release cadence

| Phase                                         | Scope checkpoint                                                                                                                                             | Minor release | Required patch band       | Phase gate checks                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------------- | ----------------------------------------------------------------------------- |
| Phase 0 - Foundations (completed)             | Pipeline hardening (Tasks 1‑4)                                                                                                                               | -             | 0.4.1 → 0.4.4             | Baseline CLI checks per task                                                  |
| Phase 1 - wp-option parity (completed)        | AST builders + fixtures (patch band complete)                                                                                                                | **0.5.0**     | 0.4.5 → 0.4.9             | CLI/core typecheck + CLI/php-driver tests                                     |
| Phase 2 - transient parity (completed)        | AST builders + cache events (Tasks 11-15 shipped)                                                                                                            | **0.6.0**     | 0.5.1 → 0.5.4             | CLI/core + transient integration tests                                        |
| Phase 3 - block builders (completed)          | SSR + JS-only builders (Tasks 16-19 shipped)                                                                                                                 | **0.7.0**     | 0.6.1 → 0.6.4             | CLI/ui + block integration smoke                                              |
| Phase 4 - command migration (completed)       | Remove legacy writers/commands (Tasks 20-26 shipped)                                                                                                         | **0.8.0**     | 0.7.1 → 0.7.6             | CLI + docs regeneration + regression run                                      |
| Phase 5 - apply layering (completed)          | Shims + flags + logging (Tasks 27-31)                                                                                                                        | **0.9.0**     | 0.8.1 → 0.8.4             | `wpk generate`/`wpk apply` acceptance run                                     |
| Phase 6 - core pipeline alignment (completed) | Align CLI docs with `core-phase-6-pipeline.md` (Tasks 32-36 shipped).                                                                                        | **0.10.0**    | 0.9.1 → 0.10.0 (shipped)  | Baseline + documentation linting                                              |
| Phase 7 - plugin bootstrap flow (planned)     | Close the scaffolding gaps (Tasks 37-45): publish the create bootstrap, emit the plugin loader, clean stale artefacts, run activation smoke, and cut 0.11.0. | **0.11.0**    | 0.10.1 → 0.11.0 (reserve) | Baseline + activation smoke (`wpk create && wpk generate && wpk apply --yes`) |
| Phase 8 - post-MVP polish (planned)           | Task 46 placeholder for diagnostics/LogLayer polish once the plugin bootstrap flow ships.                                                                    | TBD           | TBD                       | TBD                                                                           |

- **Patch bands:** Each phase reserves patch numbers in batches of three (implementation, tests, fixtures/docs) plus a buffer slot. Consume them sequentially; update [MVP Plan](cli-mvp-plan.md) as you go so parallel agents never target the same release.
- **Non-negotiables:** Every helper touched here must remain AST-first. Do not revive string-based printers, and reserve the `create*` prefix for helpers produced via `createHelper` (alias third-party `create*` functions locally if needed).
- **Phase consolidation:** The agent cutting a minor release runs the full checks for all impacted packages (`@wpkernel/cli`, `@wpkernel/core`, `@wpkernel/php-driver`, `@wpkernel/ui`) and documents the results in the release PR.

Phase 3 covered Tasks 16-19: port the legacy block printers (`packages/cli/src/printers/blocks/js-only.ts` and `packages/cli/src/printers/blocks/ssr.ts`) into the AST-first pipeline, ship the shared `ts-morph` primitives, lock parity through tests, refresh fixtures/docs, and hold the buffer slot before cutting 0.7.0. Those checkpoints are now complete; expect medium-complexity runs here-each task replaces end-to-end generation of manifests, registrars, and per-block `render.php` stubs. See [PHP AST Migration Tasks](cli-php-ast-migration.md#phase-3---block-printers-ssr--js-only-) for the detailed scope.

Phase 4 closed with Task 26: after controller safety warnings (Task 25) landed, the 0.8.0 release removed the legacy string printers and command shims so the CLI now runs exclusively through the next pipeline factories.

---

## Foundations in place

### Runtime

- `runtime/createPipeline.ts` wires IR fragments and builders using `@wpkernel/core/pipeline`.
- Helpers are created with `createHelper` and share a consistent signature (`runtime/createHelper.ts`, exported via `runtime/index.ts`).
- Extension hooks (`runtime/adapterExtensions.ts`) execute adapter factories with sandboxed writes.
- `createPhpBuilder` exposes `CreatePhpBuilderOptions` so consumers can thread PHP driver overrides (binary, script path, or `import.meta.url`) through to `createPhpProgramWriterHelper` when the bridge lives outside the default package layout, and the driver now resolves the bundled bridge via native module URL detection when `__dirname` is unavailable in ESM builds.

### Workspace

- `workspace/filesystem.ts` exposes transactional writes (`begin/commit/rollback`, `dryRun`, `tmpDir`).
- `workspace/utilities.ts` ships git hygiene (`ensureGeneratedPhpClean`), directory guards, and prompt helpers that mirror the old command surface without relying on string-based implementations.

### IR & Builders

The existing fragments derive most behaviour directly from `wpk.config.*` (current filename `wpk.config.ts`); prefer wiring helpers to output based on the current IR rather than expanding the schema.

| Fragment                         | Inputs                                             | Derived behaviour                                                                                                                       |
| -------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `meta`                           | namespace, config origin                           | Sanitised namespace (`Demo Plugin` → `DemoPlugin`), source path, origin type.                                                           |
| `schemas`                        | `schemas` map                                      | Resolves schema files, hashes content, determines provenance (`manual` vs generated), warns on missing files.                           |
| `resources`                      | `resources` map + schemas                          | Builds routes (method, transport), cache keys, storage bindings, query params, UI metadata; emits warnings for invalid configs.         |
| `blocks`                         | resource UI metadata (derived from `wpk.config.*`) | Produces `IRBlock { key, directory, manifestSource, hasRender }`, detects SSR vs JS-only by inspecting manifests/fallback `render.php`. |
| `capabilities` / `capabilityMap` | resources + optional capability map file           | Generates capability hints, fallback capabilities, missing/unused warnings.                                                             |
| php adapter                      | `adapters.php` factory                             | Allows projects to override namespace/autoload/customise PHP AST building.                                                              |

Core builders exist:

- PHP (`builders/php/**`, channel + AST writer, resource controllers, capability helper, persistence registry, index file).
- `createPhpProgramWriterHelper` accepts matching overrides via `CreatePhpProgramWriterHelperOptions`, forwarding them to `@wpkernel/php-driver` so alternative binaries or relocated bundles still resolve the pretty-print script.
- TypeScript (`builders/ts.ts` with DataView screens/fixtures plus import validation via `validateGeneratedImports`).
- Bundler (`builders/bundler.ts`) producing rollup config + asset manifests (no CLI build command planned).
- Patcher (`builders/patcher.ts`) wrapping git three-way merge plans.

### Commands

- `cli/run.ts` now registers `buildGenerateCommand`, `buildInitCommand`, `buildCreateCommand`, `buildStartCommand`, `buildDoctorCommand`, and `buildApplyCommand`; the legacy Clipanion classes were removed in v0.8.0.

### Testing

- Shared fixtures for next helpers live in `packages/test-utils/src/**` (workspace mocks, PHP AST builders, pipeline fixtures).
- Jest suites cover runtime, builders, and commands (see `packages/cli/src/**/__tests__`).
- The PHP pipeline now ships an end-to-end integration test (`packages/cli/src/builders/php/__tests__/generate.integration.test.ts`) that snapshots generated controllers/capability output to confirm the AST builders write the expected artefacts. Re-run it with `pnpm --filter @wpkernel/cli test -- --runTestsByPath packages/cli/src/builders/php/__tests__/generate.integration.test.ts` when updating fixtures.

---

## Architecture principles

- **Audit-driven** - the showcase audit exposed PHP syntax failures, import drift, bundler instability, and apply ergonomics. Every change should close those defects rather than reproduce the previous behaviour.
- **Helper-first** - fragments/builders/commands are `create*` helpers with explicit metadata (`key`, `kind`, optional `dependsOn`, `apply`). Sequencing stays deterministic; extensions plug in without patching runtime internals.
- **Separation of concerns** - helpers compose low-level drivers (PHP via `nikic/PHP-Parser`, TS via `ts-morph`, bundler via Rollup, apply via git merge). Swap drivers without touching high-level orchestration.
- **Layered apply** - generated artefacts live under `.generated/**`. Apply should update user shims that extend generated bases instead of merging controller bodies directly (see `docs/apply-workflow-phases.md`).
- **Extensibility contract** - adapter extensions run through the sandboxed pipeline hooks; third parties should plugin via helpers rather than monkey-patching core modules.
- **Authoring safety** - ESLint rules under `eslint-rules/**` (e.g., `wpk/config-consistency`, `wpk/cache-keys-valid`, `wpk/capability-hints`, `wpk/doc-links`) enforce wpk config invariants and surface doc links directly in diagnostics; keep them aligned with the latest config contract.

## Authoring safety (lint rules)

Kernel config lint rules live in `eslint-rules/**` and are wired through `eslint.config.js`. Highlights:

- `wpk/config-consistency` ensures identity params match routes, flags duplicate method/path combos, and checks storage metadata (e.g., inferred `postType` for `wp-post` storage).
- `wpk/cache-keys-valid` validates cache key functions (arrays of primitives, known query params).
- `wpk/capability-hints` warns when write routes lack `capability`.
- `wpk/doc-links` attaches documentation URLs to diagnostics so authors can jump directly to the relevant guide.

Keep these rules updated whenever the config contract evolves.

---

## Helper contract (reference)

All reusable helpers use the same shape:

```ts
import { createHelper } from '@wpkernel/cli/runtime';

export const createExampleHelper = () =>
	createHelper({
		key: 'builder.generate.example.core',
		kind: 'builder', // or 'fragment'
		mode: 'extend', // optional: 'override' | 'merge'
		dependsOn: ['builder.generate.core'],
		async apply({ context, input, output, reporter }, next) {
			// read from `input`, write through `output`, log via `reporter`
			await next?.(); // optional chaining for middleware composition
		},
	});
```

- `context` - immutable environment (workspace, reporter, phase).
- `input` - fragment helpers receive `{ draft, options }`; builder helpers receive `{ ir, options, phase }`.
- `output` - fragments expose `assign/merge` operations; builders expose `queueWrite`.
- Helpers must remain pure: no hidden global state; all filesystem writes go through the provided workspace.
- Tests should instantiate helpers with mocks from `packages/test-utils/src/**`.

---

## Current command surface

See [Command Migration & Parity Plan](cli-command-migration.md) for the authoritative command-by-command scope, legacy parity gaps, and MVP Plan mapping. Highlights:

- `apply` runs natively through `buildApplyCommand`, emits shims, enforces git, and persists `.wpk-apply.log` entries.
- `generate`, `init`, `create`, `start`, and `doctor` all run natively via `build*Command` factories with shared reporter/DI seams.
- `build` stays deprecated with no planned replacement.

---

## Workstreams & status

These align with `docs/pipeline-integration-tasks.md` and related planning docs.

1. **Apply layering & flag parity** – Completed in Phase 5; use [Apply Workflow Phases](cli-apply-workflow.md) for historical guardrails and track new diagnostics under Phase 8 Task 46 (starting with the CLI LogLayer reporter alignment).
2. **PHP AST parity** – Completed across Phases 1-3; `docs/php-ast-migration-tasks.md` now serves as an archive of the shipped parity work.
3. **Block & UI builders** – Phase 3 delivered SSR and JS-only builders plus ts-morph registrars; future UI polish will be scoped separately.
4. **Bundler workflow** – Still on the roadmap: grow `createBundler` into a reusable Vite/Rollup helper (hashed assets, manifest verification). No CLI `build` command is planned.
5. **Command migration** – Completed in Phase 4; route bootstrap/install polish into Phase 7 Tasks 37-45 and handle the CLI LogLayer reporter swap under Phase 8 Task 46 while core pipeline alignment progresses.
6. **Documentation & DX** – Ongoing. Keep this brief, the adapter spec, and AST parity plan in sync with `core/docs/**`, and export helper typings via `runtime/index.ts` for third parties.

---

## Extension & adapter story

- Adapter extensions are configured via `wpkConfig.adapters.extensions` and executed through `runtime/adapterExtensions.ts`.
- Each extension receives cloned IR, sandboxed filesystem access, and formatters; they can mutate IR via `updateIr` or queue files via `queueFile`.
- The adapter DX guide (`docs/adapter-dx.md`) details current capabilities and future recipe plans. Keep it in sync with any helper surface changes.

---

## Next steps / Definition of done

We reach “next CLI parity” when:

1. Commands (`apply`, `generate`, `start`, `init`, `doctor`) run natively on the new pipeline with feature parity (flags, logging, prompts).
2. Builders emit artefacts on par with or intentionally improved over the previous string-based implementation (PHP, blocks, TS, bundler) and golden tests capture expected differences.
3. Remaining string-based printers and command shims are retired; only the `packages/cli/src/**` pipeline remains.
4. Adapter/extension surfaces are documented, stable, and covered by unit tests (`createHelper`, adapter extensions, command factories).
5. Coverage (unit/integration/E2E) meets or exceeds the historical baseline, and lint/typecheck/test tasks run cleanly.
6. Documentation (this brief, AST parity plan, adapter spec, apply workflow) reflects the current architecture and migration status.

Keep this file updated as milestones land. Remove or archive superseded references promptly so contributors always have a single, authoritative brief.
