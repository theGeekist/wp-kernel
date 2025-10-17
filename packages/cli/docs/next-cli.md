# Next-Gen CLI – Contributor Brief

Status: **Alpha**. The next-gen pipeline lives under `packages/cli/src/next`. It is feature incomplete, but the core runtime is usable for targeted experiments.

Audience: maintainers and contributors migrating functionality from the legacy CLI (`packages/cli/src`) into the new surface.

---

## Completed Foundations

### Runtime & Helpers

- `next/runtime/createPipeline.ts` orchestrates IR fragments/builders with dependency-aware execution.
- `next/helper.ts` standardises the `create*` helper contract (metadata + shared signature) and powers the extensibility story.

### Workspace & Filesystem

- `next/workspace/filesystem.ts` delivers transactional writes, manifests, JSON helpers, and dry-run support backed by the existing test-utils.

### IR & Builders

- `next/ir/fragments/*` rebuild the legacy IR; golden tests keep showcase output in sync.
- `createPhpBuilder`, `createTsBuilder`, `createBundler`, and `createPatcher` exist, with PHP emission powered by `nikic/PHP-Parser` and AST round-tripping.

### Testing & Docs

- Jest suites cover the pipeline, workspace, and PHP bridge; doc updates consolidate guidance for contributors (this file replaces legacy notes).

Keep planning focused on what is still missing.

---

## Architecture Principles & Patterns

- **Audit-driven goals** – the showcase audit highlighted PHP syntax failures, TypeScript alias/import gaps, bundler drift, and fragile apply flows. Next-gen work must _fix_ those defects, not merely recreate legacy behaviour.
- **Helper-first design** – every fragment, builder, and command is a `create*` helper produced via `createHelper({ key, kind, mode, dependsOn, apply })`. Metadata keeps execution deterministic and makes it easy for parallel workstreams to plug in new functionality.
- **Separation of concerns** – high-level helpers compose low-level drivers (PHP via `nikic/PHP-Parser`, TS via `ts-morph`, git-backed apply). Drivers remain swappable; helpers stay pure.
- **Desired apply behaviour** – generated artefacts should live under `.generated/`, while apply steps compute diffs and delegate to git’s three-way merge so user customisations survive. Controllers should regenerate from ASTs with minimal shims:

```diff
// WPK:BEGIN AUTO
-class JobController extends BaseController {
-    // Generated implementation ...
-}
+require_once __DIR__ . '/../../.generated/php/Rest/JobController.php';
+
+class JobController extends \WPKernel\Showcase\Generated\Rest\JobController {
+    // Custom hooks live here.
+}
// WPK:END AUTO
```

- **Extensibility guarantees** – extensions register their own `create*` helpers without touching the runtime. The contract (`apply({ context, input, output, reporter })`, optional `next`, purity requirements) must stay stable as commands migrate.

### Folder snapshot

```
packages/cli/src/next/
  helper.ts               # createHelper factory
  runtime/                # createPipeline, execution graph, diagnostics
  ir/                     # createIr + fragments (meta, schemas, resources, policies, blocks)
  builders/               # createPhpBuilder, createTsBuilder, createBundler, createPatcher
  workspace/              # transactional filesystem adapter
  commands/               # NextApplyCommand (others will join)
  extensions/             # helper(s) for third-party registration
```

### Usage pattern

```ts
import { createPipeline } from '@wpkernel/cli/next/runtime';
import {
	createMetaFragment,
	createSchemasFragment,
	createResourcesFragment,
} from '@wpkernel/cli/next/ir';
import { createPhpBuilder, createPatcher } from '@wpkernel/cli/next/builders';

const pipeline = createPipeline();

pipeline.ir.use(createMetaFragment());
pipeline.ir.use(createSchemasFragment());
pipeline.ir.use(createResourcesFragment());

pipeline.builders.use(createPhpBuilder());
pipeline.builders.use(createPatcher());

await pipeline.run({ phase: 'generate', config, workspace, reporter });
```

Extensions follow the same pattern-export a `create*Extension` helper that receives the pipeline and registers additional fragments/builders. Commands should remain thin wrappers that compose helpers and pass them into the runtime.

---

## Existing Foundations to Reuse

- Core reporter/error types (`@wpkernel/core/reporter`, `@wpkernel/core/error`).
- Event bus (`@wpkernel/core/events`) for canonical lifecycle events.
- Policy/resource contracts (`@wpkernel/core/resource`, `policy`, `data`).
- WordPress tooling patterns (Gutenberg CLI scripts, `@wordpress/*` logging).
- Showcase fixtures and golden tests that already exercise the new fragments/builders.

---

## Gap Analysis vs Legacy CLI

- **Apply command** (legacy reference: `packages/cli/src/commands/apply/command.ts`) – Validates `.generated/php`, honours flags (`--yes/--backup/--force`), applies PHP _and_ block/build artefacts, and appends to `.wpk-apply.log`. `NextApplyCommand` proxies to `createPatcher` and only prints a summary.
- **IR diagnostics (generate)** – Legacy fragments emit policy/schema warnings and run adapter extensions. The next pipeline now mirrors those behaviours during `generate`; keep the diagnostics surface and extension sandboxing in lockstep with legacy parity.
- **Block printers** – Legacy printers in `packages/cli/src/printers/blocks/` produce manifests, registrars, JS-only auto-registration, and `render.php` stubs. The next pipeline never runs them because we lack a `createBlocksBuilder` helper.
- **TypeScript/UI builders** – Legacy tooling emits stores, bootstrap entrypoints, Storybook scaffolds, and block scripts (see `packages/cli/src/printers/ui/` and `packages/cli/src/printers/blocks/js-only.ts`). `createTsBuilder` currently covers only DataView screens/fixtures.
- **Bundler/build workflows** – Legacy `wpk build` orchestrates generate → Vite build → apply and validates hashed assets. The next bundler writes JSON but never drives Rollup/Vite.
- **Watch orchestration** – Legacy `wpk start` (`packages/cli/src/commands/start.ts`) implements chokidar tiers, Vite dev server, and optional auto-apply. No equivalent exists yet in `next/`.
- **Apply hygiene** – Legacy apply refuses to run when `.generated/php` has uncommitted changes (`ensureGeneratedPhpClean`). We should keep that guard even with 3-way merge.
- **Workspace utilities** – `next/workspace` lacks git/prompt helpers provided under `packages/cli/src/utils`.
- **Command surface** – Only `NextApplyCommand` is exported today; legacy exposes `init`, `generate`, `start`, `build`, `doctor`, etc.
- **Testing & docs** – Legacy CLI ships golden artefacts, integration suites, CLI transcripts, and thorough JSDoc/docs. The next pipeline currently covers units only.
- **Extensibility** – Legacy modules rely on bespoke wiring; the next pipeline intentionally surfaces `create*` helpers that need to be documented and kept stable.
- **PHP AST parity** – We currently emit PHP via the legacy printer stack; see `packages/cli/docs/php-json-ast-migration.md` for the JSON AST migration blueprint. Update both that plan and this document’s status bullets when phases complete so contributors know the latest state.

---

## Parallel Workstreams

_Update the relevant workstream below when scope changes or a milestone closes. Move completed items into "Completed Foundations" so active work stays focused._

### Workstream 1 – Apply Parity

- **Context:** Gap Analysis → Apply command. Implementation reference: `packages/cli/src/commands/apply/command.ts` and `packages/cli/src/commands/apply/ensure-generated-php-clean.ts`.
- **Current gaps**
    - `NextApplyCommand` ignores flags and logging.
    - `.generated/php` cleanliness guard is missing unless `--yes` is provided.
    - Manifest/patch handling only covers PHP files; block/build artefacts are skipped.
- **Tasks**
    1. Port flag handling, `.wpk-apply.log`, and summary output from the legacy command into `packages/cli/src/next/commands/apply.ts`.
    2. Extend `createPatcher` (next builders) so the manifest lists block/build artefacts from `.generated/build`, and have apply copy/merge them into `build/`.
    3. Keep the generated PHP cleanliness check by calling a next equivalent of `ensureGeneratedPhpClean` before applying changes (unless `--yes`).

### Workstream 2 – IR Diagnostics & Extension Execution

- **Context:** Gap Analysis → IR diagnostics (generate). Legacy reference: `packages/cli/src/commands/run-generate`.
- **Current gaps**
    - Policy/schema diagnostics and adapter extensions don’t run in the next pipeline.
    - The patcher helper consumes builder input without relying on a synthetic IR stub.
- **Tasks**
    1. Port policy/schema diagnostic logic into the next generate flow and reinstate `validateGeneratedImports`.
    2. Execute adapter extensions via the next runtime’s extension registry with sandbox → commit/rollback semantics.
    3. Keep the patcher helper contract stub-free so apply logic relies on real pipeline state.

### Workstream 3 – Builder Parity (PHP / Blocks / TS / Bundler)

- **Context:** Gap Analysis → Block printers, TypeScript/UI builders, Bundler/build workflows.
- **Current gaps**
    - Block printers are not wired (no manifests/registrars/`render.php`).
    - TypeScript builders emit only DataView scaffolds.
    - Bundler helper writes JSON but never drives Rollup/Vite or validates assets.
- **Tasks**
    1. Implement `createBlocksBuilder` in `packages/cli/src/next/builders` that wraps `generateSSRBlocks`/`generateJSOnlyBlocks` and enqueues files through workspace transactions.
    2. Extend `createTsBuilder` with creators for stores, bootstrap entrypoints, Storybook scaffolds, and block scripts using logic from `packages/cli/src/printers/ui/` and `packages/cli/src/printers/blocks/js-only.ts`.
    3. Provide a bundler workflow (either inside `createBundler` or via a dedicated command) that runs Vite/Rollup, produces hashed assets, and surfaces warnings; reuse legacy behaviour from `wpk build`.
    4. After builders run, call `validateGeneratedImports` to detect stale TS imports.

### Workstream 4 – Workspace Utilities & Command Surface

- **Context:** Gap Analysis → Workspace utilities, Command surface, Watch orchestration.
- **Current gaps**
    - Git/prompt helpers absent from `next/workspace`.
    - Only `NextApplyCommand` exported; no next equivalents for `init`, `generate`, `start`, `build`, `doctor`.
- **Tasks**
    1. Port helpers like `ensureGeneratedPhpClean`, `ensureCleanDirectory`, and prompt utilities into the next workspace layer.
    2. Implement `createInitCommand`, `createGenerateCommand`, `createStartCommand`, and `createDoctorCommand` under `packages/cli/src/next/commands`, mirroring legacy behaviour via the new helpers while the legacy `build` workflow remains in place.
    3. Export the new commands through `packages/cli/src/next/index.ts` and update docs/tests accordingly.

_Status update:_ Workspace helpers for git hygiene, directory safety, and confirmations now live under `next/workspace/utilities.ts`, and the next command surface exports factory wrappers for init, generate, start, and doctor while `build` remains a legacy-only workflow for now.

### Workstream 5 – Quality, Testing & Documentation

- **Context:** Gap Analysis → Testing & docs.
- **Tasks**
    1. Add golden fixtures/integration tests comparing legacy vs next outputs for PHP, blocks, TS, bundler, and apply.
    2. Add CLI transcript tests for the new command surface (`generate`, `start`, `build`, `apply`).
    3. Upgrade JSDoc for all exports under `packages/cli/src/next/**`.
    4. Publish updated docs in `/docs` describing architecture, extension hooks, and migration guidance.

## Definition of Done

- Apply, generate, init, doctor, and related commands achieve feature parity with the legacy CLI (including prompts, safety checks, and logging).
- Builders emit artefacts identical (or intentionally improved) relative to the legacy pipeline; golden tests document differences.
- Shared IR/config types are unified-no local stubs or duplicate aliases remain.
- Every public `create*` helper remains documented, exported, and covered by tests so extensions can continue to compose features without modifying the runtime.
- Coverage meets or exceeds the legacy CLI across unit, integration, and E2E suites.
- JSDoc is present for every public export and matches the quality bar set by `packages/core`.
- `/docs` contains an up-to-date guide to the new CLI, its extensibility points, and migration checklist.
