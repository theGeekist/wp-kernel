<!--
  WPKernel Showcase CLI validation log.
  This living document records each incremental change to the showcase configuration,
  the CLI commands executed, and the resulting state.
-->

**Plugin:** WPKernel Showcase  
**Scope:** Validation of WPKernel CLI + config pipeline  
**Maintainer:** J  
**Status:** Active (ongoing)

This log is the authoritative proof that the showcase plugin validates every major WPKernel feature end-to-end using only declarative config and the official CLI.

# CLI Validation Log

## 2024-11-14 — Baseline scaffold (`wpk init`)

- Ran `node ../../packages/cli/bin/wpk.js init --allow-dirty --force` inside `examples/showcase`.
- Result: Fresh scaffold committed (`wpk.config.ts`, plugin loader, TypeScript/Vite configs, Composer manifest).
- Notes: Repo still dirty because prior bespoke files pending deletion.

## 2024-11-14 — CLI dependency alignment

- Problem: `wpk generate` failed with `composer show nikic/php-parser failed` because the published CLI package installed via pnpm lacked `composer.json`/`composer.lock`.
- Action:
    1. Updated `examples/showcase/package.json` to depend on `@wpkernel/cli`, `@wpkernel/core`, and `@wpkernel/ui` via `workspace:*`.
    2. Reinstalled pnpm workspace (`pnpm install`) and showcase package (`pnpm install`).
    3. Rebuilt CLI via `pnpm --filter @wpkernel/cli build` to refresh bundled vendor assets.
    4. Reran `pnpm generate --allow-dirty` and `pnpm apply --allow-dirty --yes`.
- Result: Generation succeeded (12 files written under `.generated/php`); apply was a no-op because plugin loader already up to date.
- Takeaway: Monorepo validation must use `workspace:*` dependencies so the CLI’s Composer manifest remains available to readiness checks. Plugin authors consuming the published package are unaffected.

---

## Milestone Tracker

> Each milestone captures the intended config addition, the validation commands, discoveries/fixes, and completion status. Update these sections as we progress.

### Milestone 1 — Namespace only (no resources)

- **Goal**: Set target namespace (`acme-jobs`) and confirm empty config round-trips through generate/apply.
- **Validation criteria**: Generate/apply complete with no config-defined resources; namespace reflected across PHP artifacts.
- **Commands**: `pnpm generate --allow-dirty`, `pnpm apply --allow-dirty --yes`
- **Discoveries / Fixes**:
    - `wpk.config.ts` namespace updated to `acme-jobs`; generation wrote 8 PHP artifacts (namespace changes ripple through base PHP scaffolding) and apply remained a no-op.
- **Status**: ✓ Completed 2024-11-14

### Milestone 2 — Schema registry (job/application/settings)

- **Goal**: Add JSON Schemas to the project and register them under the `schemas` block in `wpk.config.ts`.
- **Validation criteria**:
    - `wpk generate` / `wpk apply` succeed with the new schema entries.
    - No validation errors for `schemas.*.path` or `schemas.*.generated.types`.
    - PHP artifacts remain stable apart from namespace / registration updates.
    - (Optional) IR inspection in tests confirms schema keys (`job`, `application`, `settings`) are loaded.
- **Commands**: `pnpm generate --allow-dirty`, `pnpm apply --allow-dirty --yes`
- **Discoveries / Fixes**:
    - Persistence registry continues to emit `['resources' => []]` because no resources declare storage yet - expected when only exercising the schema registry.
    - Schema registry is metadata-only today; `.generated/types/*.d.ts` emission is a future pipeline step.
    - Schemas are loaded into the IR and available for resources to reference, but do not yet influence REST args or runtime validation.
- **Status**: ✓ Completed 2024-11-14

### Milestone 3 — `job` resource (minimal)

- **Goal**: Add `job` resource with routes, storage, schema reference, identity.
- **Validation criteria**: REST controllers and rest-args emitted; plugin.php registers job routes; `.generated/types/job.d.ts` matches schema usage.
- **Commands**: `pnpm generate --allow-dirty`, `pnpm apply --allow-dirty --yes`
- **Artifacts to verify**: `.generated/php/Rest/JobController.php`, rest-args, types.
- **Discoveries / Fixes**:
    - Fixed a regression where the CLI writer stopped emitting `.generated/php/**` by introducing the new `createWpProgramWriterHelper` alias and switching the PHP builder/tests to use it. Verified with `pnpm exec wpk generate --allow-dirty` + `pnpm exec wpk apply --allow-dirty --yes` so controllers now land under `.generated/php/Rest`.
- **Status**: ✓ Completed 2024-11-14

### Milestone 4 — `job` resource (capabilities/query/UI)

- **Goal**: Layer capabilities, query params, cache/store helpers, admin dataview config.
- **Validation criteria**:
    - Capability map still validates alongside new query/cache/store definitions.
    - `.generated/php/Rest/JobController.php` includes query arg registration + cache helpers.
    - `.generated/ui/**` produces dataview registry + fixtures for the admin screen.
    - `plugin.php` + `inc/Rest/JobController.php` wire the generated controller after apply.
- **Commands**:
    - `pnpm exec wpk generate --allow-dirty`
    - `pnpm exec wpk apply --allow-dirty --yes`
- **Artifacts to verify**:
    - `.generated/php/Rest/JobController.php`
    - `.generated/ui/registry/dataviews/job.ts`
    - `.generated/ui/fixtures/{dataviews,interactivity}/job.ts`
    - `inc/Rest/JobController.php`
- **Validated contents**:
    - `.generated/php/Rest/JobController.php:24-210` now exposes the full REST surface: `get_rest_args()` includes the new query params, and the list handler builds both `meta_query` + `tax_query` blocks from request filters while syncing meta/taxonomy mutations.
    - `plugin.php:34-74` wires the shimmed controller plus DataViews UI bootstrap, including the localized menu entry that matches the config (slug/title/capability/position 58).
    - `.generated/ui/registry/dataviews/job.ts:4-11` and `.generated/ui/fixtures/dataviews/job.ts:1-4` mirror the admin dataview metadata straight from the config so that tooling can import it without manual glue.
- **Discoveries / Fixes**:
    - `menu.position` is validated as an integer; floating-point values (e.g. `58.5`) trip the PHP AST decoder. Documented the limitation and pinned the showcase menu to `58` for now.
    - Fixed a CLI bug where `.generated/ui/app/job/admin/@acme/jobs-admin/JobListScreen.tsx` and `.generated/ui/fixtures/interactivity/job.ts` emitted invalid TypeScript identifiers whenever `screen.component` used scoped specifiers (e.g. `@acme/...`). The builders now sanitize component names before generating functions/variables, and new Jest coverage locks this behaviour in `ts.admin-screen.test.ts` + `ts.dataview-fixture.test.ts`.
    - Patched the `createPatcher` helper so missing or empty shim targets are restored from `.wpk/apply/incoming/**`; reran `pnpm exec wpk apply --allow-dirty --yes` and confirmed `inc/Rest/JobController.php` now matches the generated class while subsequent applies report a no-op.
- **Status**: ✓ Completed 2024-11-14

### Milestone 5 — `application` resource

- **Goal**: Add `application` resource mirroring target config.
- **Validation criteria**:
    - Application REST controller emits string identity, meta synchronization, and status filters derived from `schemas.application`.
    - UI fixtures and admin screen (route `acme-applications`) compile with the project tsconfig.
    - Plugin loader registers both job + application controllers and localizes dataview metadata.
- **Commands**:
    - `pnpm exec wpk generate --allow-dirty`
    - `pnpm exec wpk apply --allow-dirty --yes`
- **Artifacts to verify**:
    - `.generated/php/Rest/ApplicationController.php`
    - `.generated/ui/app/application/admin/ApplicationsAdminScreen.tsx`
    - `.generated/ui/fixtures/interactivity/application.ts`
    - `.generated/ui/registry/dataviews/application.ts`
    - `inc/Rest/ApplicationController.php`
- **Validated contents**:
    - `.generated/php/Rest/ApplicationController.php:1-210` wires string UUID identity, schema-enforced status enum, and wp-post mutations including meta sync for `job_id`, `cv_attachment_id`, and `status`.
    - `.generated/ui/app/application/admin/ApplicationsAdminScreen.tsx:1-60` + `.generated/ui/fixtures/interactivity/application.ts:1-60` import the declarative resource from `@/resources/application` (new stub that re-exports `wpk.config.ts`) and expose the admin DataView runtime helpers.
    - `inc/Rest/ApplicationController.php:1-20` now exists and extends the generated controller shim just like `JobController`.
- **Discoveries / Fixes**:
    - Had to add `src/resources/application.ts` to re-export `wpkConfig.resources.application`; otherwise the generated UI fixtures failed to compile because the default `@/resources/application` import had no backing module.
    - `createPatcher` restored empty/missing shims automatically (fix from Milestone 4) so application shim creation required no manual edits.
    - **Fixed**: CLI now surfaces UI metadata inside the IR (`ir.ui.resources`) via a dedicated fragment, so both the PHP builder and apply plan emit the `enqueue_wpkernel_ui_assets` function again. Verified by rerunning `pnpm exec wpk generate --allow-dirty` (debug dump in `.wpk/debug-ui.json`) and inspecting `.wpk/apply/incoming/plugin.php` to confirm the UI hook + localization payload survive plan generation. Apply still reports a conflict until we accept the generated loader, but the generated artifact is now correct.
    - **Fixed**: `resolveResourceImport` now scaffolds `src/resources/<resource>.ts` on demand (re-exporting `wpkConfig.resources[...]` with a relative import). Generated admin screens/interactivity fixtures always have a module to import, removing the need for manual stubs and keeping ESLint happy.
- **Status**: ✓ Completed 2024-11-15

### Milestone 6 — Remaining resources

- **Goal**: Add `settings` (wp-option singleton), `jobCategory` (taxonomy), and `statusCache` (transient cache) resources so the showcase exercises every storage adapter the CLI currently supports.
- **Validation criteria**:
    - Config compiles without relying on functions; storage descriptors remain declarative for wp-option/wp-taxonomy/transient adapters.
    - `.generated/php/Rest/**` emits one controller per resource with adapter-specific helpers (option CRUD, WP_Term queries, transient serialization).
    - Apply stage wires the new controllers into `plugin.php` and hydrates matching `inc/Rest/**` shims without manual edits.
- **Commands**:
    - `pnpm generate --allow-dirty`
    - `pnpm apply --allow-dirty --yes`
- **Artifacts to verify**:
    - `.generated/php/Rest/SettingsController.php`
    - `.generated/php/Rest/JobCategoryController.php`
    - `.generated/php/Rest/StatusCacheController.php`
    - `src/blocks/{settings,jobcategory,statuscache}/block.json` (surfaced from `.generated/blocks/**` during apply)
    - `inc/Rest/{SettingsController,JobCategoryController,StatusCacheController}.php`
    - `plugin.php`
- **Validated contents**:
    - `.generated/php/Rest/SettingsController.php:1-120` exposes wp-option accessors (`getSettingsOptionName`, `normaliseSettingsAutoload`) and enforces the schema keys we registered in `wpk.config.ts`.
    - `.generated/php/Rest/JobCategoryController.php:1-170` wires taxonomy-backed list/get routes, including pagination, `WP_Term_Query`, and validation helpers for the numeric identifier we declared in the config.
    - `.generated/php/Rest/StatusCacheController.php:1-120` maps directly to the transient adapter with helpers to normalise expiration + namespace keys.
    - `src/blocks/*/block.json` now mirrors the new resources so UI builders/plugins can register blocks without bespoke metadata.
    - `plugin.php:34-74` enumerates all five controllers (job, application, jobCategory, settings, statusCache) so WordPress registers each REST namespace, and `inc/Rest/*.php` shims extend the generated controllers ready for customization.
- **Discoveries / Fixes**:
    - Identity validation failed for `jobCategory` because the lone list route never exposed `:id`. Added a dedicated GET route/capability pair in `wpk.config.ts:384-411` so the CLI can map the numeric identifier and generate the REST handler.
    - `wpk apply` reported a conflict while `plugin.php` still carried earlier manual edits. Accepted `.wpk/apply/incoming/plugin.php` and reran apply so future runs stay idempotent and the CLI remains the single writer for the plugin loader.
    - Added `blocks: { mode: 'ssr' }` to the `job` resource so the CLI produces a server-rendered Gutenberg block (block.json, TypeScript registrar, `src/blocks/job/render.php`, and PHP `Blocks/Register.php`). This keeps SEO-sensitive listings honest and exercises the new SSR plumbing end-to-end.
- **Status**: ✓ Completed 2025-11-15

### Milestone 7 — Blocks pipeline rehab (SSR + loader integration)

- **Goal**: Close the drift between config/IR/builders so resource-level blocks (JS-only + SSR) are generated, registered, and documented end-to-end.
- **Validation criteria**:
    - `blocks` config contract exposes `mode: 'js' | 'ssr'` and fails fast if executable fields/functions appear.
    - IR gains derived block metadata so `createPhpBlocksHelper` can emit `.generated/php/Blocks/Register.php` and `.generated/build/blocks-manifest.php`.
    - PHP writer successfully pretty-prints the registrar (fixing the `\WP_Block` namespace bug) and apply accepts the regenerated `plugin.php` without conflicts.
    - README explains the manual bundler hook for `src/blocks/**` so future scaffolds stay deterministic.
    - Jest regression test (`packages/wp-json-ast/src/blocks/__tests__/module.test.ts`) asserts the registrar contains a fully-qualified `WP_Block`.
- **Commands**:
    - `pnpm generate --allow-dirty`
    - `pnpm apply --allow-dirty --yes`
    - `pnpm --filter @wpkernel/wp-json-ast test -- --runTestsByPath src/blocks/__tests__/module.test.ts`
- **Artifacts to verify**:
    - `.generated/php/Blocks/Register.php` (registrar) and `.generated/php/Blocks/Register.php.ast.json`
    - `.generated/build/blocks-manifest.php`
    - `src/blocks/job/render.php` (editable SSR stub)
    - `examples/showcase/README.md` blocks section
    - `jest.config.base.js` ignore rule for `packages/cli/dist`
- **Discoveries / Fixes**:
    - Blocks IR/builders had gone stale: `resources.*.blocks` wasn’t parsed, `createPhpBlocksHelper` never derived SSR targets, and `wp-json-ast` still referenced the old JSON-only schema. Added the config type/schema/docs entries plus IR plumbing so the resource definition now rounds-trip into block manifests (`packages/cli/src/config/types.ts`, `packages/cli/src/ir/shared/resource-builder.ts`, `docs/reference/wpk-config.schema.json`).
    - PHP printer crashed with `Name parts must be non-empty` because we built nullable types using `buildName(['\\WP_Block'])`. Swapped to `buildFullyQualifiedName(['WP_Block'])` so the registrar uses canonical names and the writer no longer strips the leading segment (`packages/wp-json-ast/src/blocks/registrar/methods/render.ts`).
    - Restored block manifest/registrar generation by feeding derived SSR blocks into the PHP builder, staging render stubs, and removing the earlier `console.log` instrumentation (`packages/cli/src/builders/php/block.artifacts.ts`).
    - Accepted `.wpk/apply/incoming/plugin.php` to resolve the standing conflict and documented the manual bundler hook + SSR outputs in `examples/showcase/README.md`.
    - Added `modulePathIgnorePatterns: ['packages/cli/dist']` to `jest.config.base.js` so Jest stops seeing duplicate packages after we rebuild the CLI, then reran the focused block test to lock in coverage.
- **Status**: ✓ Completed 2025-11-15

### Milestone 8 — Seeds & README refresh

- **Goal**: Restore/update seeding scripts + rewrite README to describe the lean template.
- **Validation criteria**: Seeds reference current routes/resources; README instructions align with new workflow; generate/apply idempotent.
- **Commands**: `pnpm generate --allow-dirty`, `pnpm apply --allow-dirty --yes` (final check), plus lint/tests as needed.
- **Discoveries / Fixes**:
    - _TBD_
- **Status**: _Pending_

### Milestone 9 — Final Validation

- **Goal**: Confirm end-to-end by running `pnpm generate --allow-dirty`, `pnpm apply --allow-dirty --yes`, `pnpm lint`, and relevant tests.
- **Validation criteria**: All commands succeed; `pnpm doctor` passes readiness checks; git diff contains only intentional artifacts.
- **Notes / Findings**:
    - Run `pnpm doctor` to verify readiness helpers and builder registration.
    - _TBD_
- **Status**: _Pending_
