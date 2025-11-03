# wpk CLI MVP Plan

_See [Docs Index](./index.md) for navigation._

> **Versioning reminder:** The CLI rides the unified **v0.10.x (pre-1.0)** track. Phase 6 patch slots (0.9.1-0.10.0) are closed; reserve the next open 0.10.x slot for Phase 7+ work, update the status when you land, and consolidate into the parent phase release once every patch in that band ships.

## Coordination & guardrails

- **Non-negotiables:** Helpers that participate in the next pipeline must retain AST-first behaviour. Never introduce or wrap string-based PHP printers, and reserve the `create*` prefix for helpers produced by `createHelper` (alias third-party `create*` imports if needed).
- **Parallel runs:** Before picking up work, check the reserved version slot and set its status to `🚧 in-progress`. When your PR merges, flip the slot to `✓ shipped` and note the PR link so downstream phases can verify all prerequisites.
- **Required checks (baseline):** Every task runs at least `pnpm --filter @wpkernel/cli lint`, `pnpm --filter @wpkernel/cli typecheck`, `pnpm --filter @wpkernel/cli typecheck:tests`, and `pnpm --filter @wpkernel/cli test`. Tasks that touch the PHP driver also run `pnpm --filter @wpkernel/php-driver test`. Parent phase releases add the full suite listed in [CLI Migration Phases](./cli-migration-phases.md).
- **Version bumps happen last:** Reserve your slot up front, implement and review without touching package versions, then-after approvals and a fresh rebase-apply the bump across all packages/CHANGELOGs in a final commit before merging. Update the ledger entry with the PR link as you flip it to `✓ shipped`.
- **Snapshot updates:** When tests rely on Jest snapshots, rerun them with `pnpm --filter @wpkernel/cli test -u` and include the updated files in your patch.

### Active gaps before Phase 7

- **Bootstrap installers are missing.** There is no published wrapper such as `@wpkernel/create-wpk`, so the npm bootstrap flow cannot forward `--name` to `wpk create`. The CLI command already expects that flag in [`packages/cli/src/commands/create.ts`](../src/commands/create.ts), and the new workspace helper exposed via `pnpm monorepo:create` (backed by [`scripts/register-workspace.ts`](../../../scripts/register-workspace.ts)) must be used to stand up the bootstrap package safely inside the monorepo.
- **Scaffolds do not register a plugin.** `generate` emits controllers and apply manifests but never writes a WordPress plugin header or loader; the starter template still ships an empty `inc/.gitkeep` placeholder in [`packages/cli/templates/init/inc`](../templates/init/inc/.gitkeep). We need an AST helper that creates the minimal bootstrap file and gracefully skips regeneration when authors already provide one.
- **Regeneration leaves stale artefacts behind.** Removing resources from `wpk.config.ts` does not clean previously generated files because the pipeline only writes additions in [`packages/cli/src/commands/generate.ts`](../src/commands/generate.ts) and the workspace removal hook in [`packages/cli/src/workspace/filesystem.ts`](../src/workspace/filesystem.ts) is unused.

### Phase 7 complexity review

Reviewing each Phase 7 job surfaced additional risk beyond the four patch slots originally reserved:

- **Bootstrap installers touch multiple systems.** Registering `@wpkernel/create-wpk` requires generating the workspace with `pnpm monorepo:create packages/create-wpk`, adding a package entry point that proxies into the CLI binary, and writing smoke coverage that exercises the published wrapper end-to-end. Splitting the work lets us land the workspace safely before wiring the forwarding/telemetry logic.
- **Plugin adoption spans more than one command.** Hardening `wpk init` to respect author assets requires updates to [`packages/cli/src/commands/init/workflow.ts`](../src/commands/init/workflow.ts), collision detection in [`packages/cli/src/commands/init/scaffold.ts`](../src/commands/init/scaffold.ts), and the template set in [`packages/cli/templates/init`](../templates/init). The bootstrap generator itself also needs dedicated tasks inside the pipeline so `generate` (see [`packages/cli/src/commands/generate.ts`](../src/commands/generate.ts)) and `apply` (see [`packages/cli/src/commands/apply.ts`](../src/commands/apply.ts)) can reason about when to emit or skip the loader.
- **Cleanup spans manifests and user shims.** Persisting prior plans for deletion detection touches `.wpk/apply/plan.json`, the manifest writer in [`packages/cli/src/apply/manifest.ts`](../src/apply/manifest.ts), and the filesystem helpers in [`packages/cli/src/workspace/filesystem.ts`](../src/workspace/filesystem.ts). We also need follow-up coverage to ensure shim removals do not clobber author overrides in [`packages/cli/tests/integration`](../tests/integration).
- **Activation polish is broader than docs.** The activation smoke needs a WordPress-aware harness (Playwright + `@wpkernel/e2e-utils`), richer comments inside `wpk.config.ts`/`src/index.ts`, and new quick-start docs across this directory. Staging that work after the generator settles keeps the templates and published guidance in lockstep.

The ledger below expands Phase 7 into incremental tasks so each cross-cutting concern can merge independently without blocking the release train.

See [Phase 7 – Plugin bootstrap flow](./phase-7-plugin-bootstrap.md) for the extended spec that motivates the new tasks below.

## Release ledger

| Phase | Status         | Version band               | Summary                                                                                                                            | Ledger                                                  |
| ----- | -------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 0     | ✓ Complete     | 0.4.1 → 0.4.4              | Pipeline hardening (writer helper, builder audits, end-to-end coverage).                                                           | [Jump](#phase-0--foundations--complete)                 |
| 1     | ✓ Complete     | 0.4.5 → 0.5.0              | wp-option parity across builders, tests, docs, and release prep.                                                                   | [Jump](#phase-1--resource-parity--complete)             |
| 2     | ✓ Complete     | 0.5.1 → 0.6.0              | Transient storage parity, cache hygiene, and documentation refresh.                                                                | [Jump](#phase-2--transient-storage-parity--complete)    |
| 3     | ✓ Complete     | 0.6.1 → 0.7.0              | Block builder parity (SSR + JS-only) and printer retirement prerequisites.                                                         | [Jump](#phase-3--block-builder-parity--complete)        |
| 4     | ✓ Complete     | 0.7.1 → 0.8.0              | Command migration factories and string-printer retirement.                                                                         | [Jump](#phase-4--command-migration--complete)           |
| 5     | ✓ Complete     | 0.8.1 → 0.9.0              | Apply layering, shims, safety flags, and the 0.9.0 release.                                                                        | [Jump](#phase-5--apply-layering--complete)              |
| 6     | ✓ Complete     | 0.9.1 → 0.10.0 (shipped)   | Core pipeline/doc alignment (Tasks 32-36). See [Phase 6 – Core Pipeline Orchestration](../core/docs/phase-6-core-pipeline.md.md).  | [Jump](#phase-6--core-pipeline-alignment--complete)     |
| 7     | 🚧 In Progress | 0.10.1 → 0.11.0 (reserved) | Plugin bootstrap flow (Tasks 37-45) closing the scaffolding gaps called out above.                                                 | [Jump](#phase-7--plugin-bootstrap-flow--planned)        |
| 8     | 🚧 In Progress | 0.11.1 → 0.12.0 (reserved) | UI baseline experience (Tasks 46-52) tracked in [`packages/ui/docs/phase-8-ui-baseline.md`](../../ui/docs/phase-8-ui-baseline.md). | [Jump](#phase-8--ui-baseline-experience-🚧-in-progress) |
| 9     | ⬜ Planned     | 0.12.1 → 0.13.0 (reserved) | Post-MVP polish placeholder (Tasks 53-55) covering CLI LogLayer adoption and interactivity-aware generators once Phase 8 lands.    | [Jump](#phase-9--post-mvp-polish--planned)              |

## Completed phases

### Phase 0 – Foundations (✓ Complete)

Hardens the pipeline by enforcing AST-first writer usage, auditing helper purity, and adding end-to-end coverage for the generate flow. These guardrails stabilised the PHP driver configuration and created the baseline for later phases.

<details>
<summary>Phase 0 ledger</summary>

| Slot  | Scope                                             | Status    | Notes                                                         | Detail reference                                                                                                                       |
| ----- | ------------------------------------------------- | --------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 0.4.1 | Task 1 - Harden PHP writer helper                 | ✓ shipped | Coverage + logging guardrails landed via writer helper tests. | [Pipeline integration hardening](./pipeline-integration-tasks.md#item1--harden-next-php-writer-helper-complexity-lowmedium)            |
| 0.4.2 | Task 2 - Audit PHP builder helpers for AST purity | ✓ shipped | Verify all helpers use canonical factories + add tests.       | [Pipeline integration hardening](./pipeline-integration-tasks.md#item2--audit-php-builder-helpers-for-ast-purity-complexity-medium)    |
| 0.4.3 | Task 3 - End-to-end generate coverage             | ✓ shipped | Integration test snapshots cover PHP + AST artefacts.         | [Pipeline integration hardening](./pipeline-integration-tasks.md#item3--end-to-end-generate-pipeline-coverage-complexity-mediumhigh)   |
| 0.4.4 | Task 4 - Driver configuration & documentation     | ✓ shipped | Update docs + exports alongside code.                         | [Pipeline integration hardening](./pipeline-integration-tasks.md#item4--surface-driver-configuration--documentation-complexity-medium) |

</details>

### Phase 1 – Resource parity (✓ Complete)

Delivers wp-option parity end-to-end: builders, fixtures, documentation, and the 0.5.0 release. The phase also confirmed the release engineering process for the new pipeline.

<details>
<summary>Phase 1 ledger</summary>

| Slot  | Scope                                           | Status    | Notes                                                                                                   | Detail reference                                                                                           |
| ----- | ----------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 0.4.5 | Task 5 - (wp-option parity) - AST builders land | ✓ shipped | AST builders + helpers for wp-option controllers now live in the next pipeline.                         | [PHP AST migration - Phase 1 deliverables](./php-ast-migration-tasks.md#phase-1--wp-option-storage-parity) |
| 0.4.6 | Task 6 - wp-option parity tests                 | ✓ shipped | Snapshot coverage + writer assertions confirm queued `PhpProgram` payloads emit matching PHP/AST pairs. | [PHP AST migration - Phase 1 deliverables](./php-ast-migration-tasks.md#phase-1--wp-option-storage-parity) |
| 0.4.7 | Task 7 - wp-option fixtures/docs                | ✓ shipped | Integration fixtures now queue wp-option controllers and docs capture the updated flows.                | [PHP AST migration - Phase 1 deliverables](./php-ast-migration-tasks.md#phase-1--wp-option-storage-parity) |
| 0.4.8 | Task 8 - Buffer hotfix for Phase 1 work         | ✓ shipped | No regressions surfaced after review; buffer slot closed without requiring a patch.                     | [PHP AST migration - Version cadence](./php-ast-migration-tasks.md#version-cadence)                        |
| 0.4.9 | Task 9 - Release engineering prep               | ✓ shipped | Changelog rollup + monorepo version bump prepared for the 0.5.0 handoff.                                | [Release process](../../RELEASING.md#1%EF%B8%8F%E2%83%A3-versioning-rules)                                 |
| 0.5.0 | Task 10 - **Phase 1 minor**                     | ✓ shipped | All 0.4.x slots closed; 0.5.0 shipped via the unified release checklist.                                | [Release process](../../RELEASING.md#3%EF%B8%8F%E2%83%A3-release-process)                                  |

</details>

### Phase 2 – Transient storage parity (✓ Complete)

Extends parity to transient storage, including TTL handling, cache invalidation, documentation, and the 0.6.0 release cadence.

<details>
<summary>Phase 2 ledger</summary>

| Slot  | Scope                                      | Status    | Notes                                                                                                                | Detail reference                                                                                       |
| ----- | ------------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 0.5.1 | Task 11 - Transient AST builders land      | ✓ shipped | AST helpers for transient controllers now live in the next pipeline with key sanitisation + TTL normalisation.       | [Phase 2 - transient builders](./php-ast-migration-tasks.md#task-11--transient-ast-builders)           |
| 0.5.2 | Task 12 - Transient parity tests           | ✓ shipped | Builder and controller suites cover transient cache metadata, TTL helpers, and WP_Error fallbacks.                   | [Phase 2 - transient tests](./php-ast-migration-tasks.md#task-12--transient-parity-tests)              |
| 0.5.3 | Task 13 - Transient fixtures & docs        | ✓ shipped | CLI goldens + docs refreshed so transient helpers surface in fixtures and contributor guides.                        | [Phase 2 - transient fixtures/docs](./php-ast-migration-tasks.md#task-13--transient-fixtures-and-docs) |
| 0.5.4 | Task 14 - Buffer slot for transient parity | ✓ shipped | DELETE handlers now clear transient storage and emit cache invalidation events so per-entity caches stay consistent. | [Phase 2 - buffer cadence](./php-ast-migration-tasks.md#task-14--phase-2-buffer-slot)                  |
| 0.6.0 | Task 15 - **Phase 2 minor**                | ✓ shipped | 0.6.0 cut with full release checks after closing the transient buffer slot; Phase 3 patch band now open.             | [Release process](../../RELEASING.md#3%EF%B8%8F%E2%83%A3-release-process)                              |

</details>

### Phase 3 – Block builder parity (✓ Complete)

Rebuilds block registrars, manifests, and render stubs on the AST-first pipeline. This phase cleared the path for retiring legacy printers and cutting the 0.7.0 release.

<details>
<summary>Phase 3 ledger</summary>

| Slot  | Scope                                    | Status    | Notes                                                                                                                                                       | Detail reference                                                          |
| ----- | ---------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 0.6.1 | Task 16 - Block builder implementation   | ✓ shipped | Shared manifest staging, SSR render helpers, and registrar wiring now run through the next pipeline so PHP and TypeScript outputs share import conventions. | [Phase 3 - implementation](./php-ast-migration-tasks.md#task-16)          |
| 0.6.2 | Task 17 - Block parity tests             | ✓ shipped | Added SSR/JS registrar suites and integration coverage validating ts-morph registrars, render stubs, and manifest caching.                                  | [Phase 3 - tests](./php-ast-migration-tasks.md#task-17)                   |
| 0.6.3 | Task 18 - Block fixtures & documentation | ✓ shipped | Refreshed fixtures and docs to describe the AST-first block pipeline and retired string printers.                                                           | [Phase 3 - fixtures/docs](./php-ast-migration-tasks.md#task-18)           |
| 0.6.4 | Task 19 - Phase 3 buffer slot            | ✓ shipped | Closed the buffer with manifest cache invalidation fixes so render and registrar edits rerun builders ahead of the release.                                 | [Phase 3 - buffer](./php-ast-migration-tasks.md#task-19)                  |
| 0.7.0 | Phase 3 release                          | ✓ shipped | Monorepo version bump and changelog rollup after completing Tasks 16-19.                                                                                    | [Release process](../../RELEASING.md#3%EF%B8%8F%E2%83%A3-release-process) |

</details>

### Phase 4 – Command migration (✓ Complete)

Migrates every CLI command to the helper-first pipeline, introduces the `build*Command` factories, removes string printers, and ships the 0.8.0 release.

<details>
<summary>Phase 4 ledger</summary>

| Slot  | Scope                                               | Status    | Notes                                                                                                                                                          | Detail reference                                                                                                    |
| ----- | --------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 0.7.1 | Task 20 - Apply command factory & manifest plumbing | ✓ shipped | `buildApplyCommand` now produces `ApplyCommand` with injectable patcher/manifest helpers and manifest summary printing.                                        | [Command migration - apply](./command-migration-plan.md#31-apply)                                                   |
| 0.7.2 | Task 21 - Init/create parity                        | ✓ shipped | Next-gen `init` scaffolds via workspace helpers, warns when git is missing, and the new `create` wrapper initialises git and installs npm/composer deps.       | [Command migration - init/create](./command-migration-plan.md#33-init)                                              |
| 0.7.3 | Task 22 - Native generate command                   | ✓ shipped | Native pipeline command composes `createPipeline`, wraps workspace transactions, and streams adapter diagnostics with summary reporting.                       | [Command migration - generate](./command-migration-plan.md#32-generate)                                             |
| 0.7.4 | Task 23 - Start & doctor orchestration              | ✓ shipped | Native watcher now drives regeneration + optional PHP auto-apply, and doctor performs config, composer, workspace, and PHP-driver health checks.               | [Command migration - start](./command-migration-plan.md#35-start) / [doctor](./command-migration-plan.md#36-doctor) |
| 0.7.5 | Task 24 - Capability helper parity                  | ✓ shipped | AST helper now enforces capabilities, resolves bindings, emits structured `WP_Error`s, and reports fallback capability warnings through the pipeline reporter. | [Capability helper parity](./php-ast-migration-tasks.md#task-24---capability-helper-parity)                         |
| 0.7.6 | Task 25 - Safety warnings & derived blocks          | ✓ shipped | Next pipeline warns on missing write capabilities and derives JS-only block manifests so resources without scaffolds emit auto-registered stubs.               | [Controller safety & block derivation](./php-ast-migration-tasks.md#task-25---controller-safety--block-derivation)  |
| 0.8.0 | Task 26 - **Phase 4 minor**                         | ✓ shipped | Retired string printers and the legacy command layer; CLI now registers factories only and v0.8.0 cuts the Phase 4 release.                                    | [Command migration summary](./command-migration-plan.md#4-dependencies--sequencing)                                 |

</details>

### Phase 5 – Apply layering (✓ Complete)

Completes the layered apply experience with shims, safety rails, logging parity, and the 0.9.0 release checklist.

<details>
<summary>Phase 5 ledger</summary>

| Slot  | Scope                                         | Status    | Notes                                                                                                                                         | Detail reference                                                                                       |
| ----- | --------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 0.8.1 | Task 27 - Shim generation & composer fallback | ✓ shipped | Next pipeline emits extension shims, adds `require_once` fallback guards, and persists builder actions into `.wpk/apply/manifest.json`.       | [Apply workflow - shims](./apply-workflow-phases.md#3-implementation-plan)                             |
| 0.8.2 | Task 28 - Flags, git enforcement, logging     | ✓ shipped | Ported `--yes/--backup/--force`, enforced `.git`, appended `.wpk-apply.log`, and aligned reporter output with the legacy command.             | [Apply workflow - safety rails](./apply-workflow-phases.md#3-implementation-plan)                      |
| 0.8.3 | Task 29 - Integration coverage                | ✓ shipped | Builder + command suites now cover shim regeneration merges, composer fallback `require_once` guards, and apply log status variants.          | [Apply workflow - tests](./apply-workflow-phases.md#3-implementation-plan)                             |
| 0.8.4 | Task 30 - Buffer slot                         | ✓ shipped | Hardened git detection so workspaces nested inside mono-repos respect ancestor repositories before the 0.9.0 release cut.                     | [Apply workflow guard](./apply-workflow-phases.md#1-current-state-next)                                |
| 0.9.0 | Task 31 - **Phase 5 minor**                   | ✓ shipped | Closed out Task 31 by cutting the 0.9.0 release after validating `wpk generate && wpk apply --yes --dry-run` and updating the migration docs. | [Apply workflow release checklist](./apply-workflow-phases.md#phase-05---apply-workflow-next-pipeline) |

</details>

### Phase 6 – Core pipeline alignment (✓ Complete)

Ran alongside the core runtime migration so CLI guidance matched the new pipeline orchestration. The phase closes with the pipeline-only runtime, diagnostics polish, the interactivity bridge, and a coordinated 0.10.0 release.

<details>
<summary>Phase 6 ledger</summary>

| Slot   | Task                                     | Status    | Notes                                                                                           | Reference                                                                                                   |
| ------ | ---------------------------------------- | --------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 0.9.1  | Task 32 – Core pipeline scaffolding      | ✓ shipped | Helper catalogue and shared harnesses published; CLI docs now reference the helper naming map.  | [Spec](../core/docs/phase-6-core-pipeline.md.md#patch-091---task-32-core-pipeline-scaffolding)              |
| 0.9.2  | Task 33 – Migrate `defineAction`         | ✓ shipped | `defineAction` now runs exclusively through `createActionPipeline`; parity coverage documented. | [Spec](../core/docs/phase-6-core-pipeline.md.md#patch-092---task-33-migrate-defineaction-to-the-pipeline)   |
| 0.9.3  | Task 34 – Migrate `defineResource`       | ✓ shipped | Resource definitions share the pipeline helpers and updated reporter diagnostics.               | [Spec](../core/docs/phase-6-core-pipeline.md.md#patch-093---task-34-migrate-defineresource-to-the-pipeline) |
| 0.9.4  | Task 35 – Buffer & extension diagnostics | ✓ shipped | Diagnostics, helper cleanup, and the interactivity bridge landed ahead of the release cut.      | [Spec](../core/docs/phase-6-core-pipeline.md.md#patch-094---task-35-buffer--extension-diagnostics)          |
| 0.10.0 | Task 36 – Phase 6 minor release          | ✓ shipped | Coordinated 0.10.0 release completed with changelog roll-up and documentation sweep.            | [Spec](../core/docs/phase-6-core-pipeline.md.md#minor-0100---task-36-release-and-documentation-rollup)      |

</details>

## Upcoming phases

### Phase 7 – Plugin bootstrap flow (🚧 In Progress)

Close the scaffolding gaps identified above so `create → generate → apply` results in an immediately activatable plugin. Track the detailed scope in [Phase 7 – Plugin bootstrap flow](./phase-7-plugin-bootstrap.md) and update the ledger as each patch lands.

| Slot                                                                                                | Task                                                | Status     | Notes                                                                                                                                                                                                                                                         | Reference                                                                                   |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 0.10.1                                                                                              | Task 37 – Register the bootstrap workspace          | ✓ shipped  | Workspace scaffolded via `pnpm monorepo:create packages/create-wpk`; `@wpkernel/create-wpk` now ships the npm/pnpm/yarn bootstrap binary with argument forwarding, telemetry, and smoke coverage landing in Task 38.                                          | [Spec](./phase-7-plugin-bootstrap.md#patch-0101---task-37-register-the-bootstrap-workspace) |
| 0.10.2                                                                                              | Task 38 – Wire the bootstrap proxy & smoke coverage | ✓ shipped  | Bootstrap launcher forwards positional targets/flags, emits telemetry under `wpk.cli.bootstrap`, and now ships with integration smoke coverage that builds the published binary on demand.                                                                    |
| [Spec](./phase-7-plugin-bootstrap.md#patch-0102---task-38-wire-the-bootstrap-proxy--smoke-coverage) |
| 0.10.3                                                                                              | Task 39 – Init adoption guardrails                  | ✓ shipped  | `wpk init` now partitions WPK-managed vs author templates, skips author-owned collisions, logs detected plugin markers (composer autoload metadata and root-level plugin headers), and ships regression coverage for clean and established plugin workspaces. |
| [Spec](./phase-7-plugin-bootstrap.md#patch-0103---task-39-init-adoption-guardrails)                 |
| 0.10.4                                                                                              | Task 40 – Bootstrap generator foundation            | ✓ shipped  | Plugin loader factory + CLI helper land with init template parity and documented contract; integration wiring follows in Task 41.                                                                                                                             | [Spec](./phase-7-plugin-bootstrap.md#patch-0104---task-40-bootstrap-generator-foundation)   |
| 0.10.5                                                                                              | Task 41 – Generate/apply integration for the loader | ✓ shipped  | PHP builder now queues `plugin.php`, `.generated/php/index.php` requires the loader, the apply planner stages guarded loader merges, and integration coverage proves generate → apply respects author overrides.                                              |
| [Spec](./phase-7-plugin-bootstrap.md#patch-0105---task-41-generateapply-integration-for-the-loader) |
| 0.10.6                                                                                              | Task 42 – Manifest persistence & deletion tracking  | ✓ shipped  | Generation manifests persist at `.wpk/apply/state.json`, `wpk generate` prunes stale `.generated/**` artefacts when resources or paths change, and the apply plan records shim deletions for `wpk apply`.                                                     |
| [Spec](./phase-7-plugin-bootstrap.md#patch-0106---task-42-manifest-persistence--deletion-tracking)  |
| 0.10.7                                                                                              | Task 43 – Apply cleanup & override safety           | ⬜ Planned | Ensure shim removals respect author overrides, expand integration coverage, and add targeted cleanup commands if needed.                                                                                                                                      | [Spec](./phase-7-plugin-bootstrap.md#patch-0107---task-43-apply-cleanup--override-safety)   |
| 0.10.8                                                                                              | Task 44 – Activation smoke & docs alignment         | ⬜ Planned | Run the activation smoke test, enrich config comments, and update CLI docs/README with the turnkey plugin workflow.                                                                                                                                           | [Spec](./phase-7-plugin-bootstrap.md#patch-0108---task-44-activation-smoke--docs-alignment) |
| 0.11.0                                                                                              | Task 45 – Phase 7 minor release                     | ⬜ Planned | Run the full release checklist once Tasks 37-44 close and roll the documentation/changelog updates into the minor.                                                                                                                                            | [Spec](./phase-7-plugin-bootstrap.md#minor-01100---task-45-phase-7-minor-release)           |

### Phase 8 – UI baseline experience (🚧 In Progress)

Phase 8 shifts to the UI package so authors can describe a resource once and immediately see an upgraded admin surface. Track the full scope-including DataViews schema gaps, async UX primitives, interactivity bridges, and observability hooks-in [`packages/ui/docs/phase-8-ui-baseline.md`](../../ui/docs/phase-8-ui-baseline.md). The ledger there defines Tasks 46‑52 across the 0.11.1 → 0.12.0 release band and lists the CLI touch-points that close the loop once the UI work ships.

- ✓ Task 46 – DataViews schema expansion: UI runtime now ingests saved views, menu metadata, and richer column definitions automatically during `attachUIBindings()` setup so the CLI can follow with generator updates.
- ✓ Task 47 – Async boundaries & notices: Resource screens share loading/empty/error/permission boundaries and emit success/failure notices through `core/notices`, keeping reporter diagnostics aligned with the runtime.

### Phase 9 – Post-MVP polish (⬜ Planned)

Reserve Phase 9 for incremental CLI polish after the UI baseline lands. The queue carries forward the diagnostics and interactivity scaffolding originally slated for Phase 8 so they can build on the new UI primitives.

| Slot   | Task                                       | Status     | Notes                                                                                                                                                                                                      | Reference                                                     |
| ------ | ------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 0.12.1 | Task 53 – LogLayer reporter & follow-on DX | ⬜ Planned | Replace `createConsoleReporter()` in `packages/cli/vite.config.ts` with `createReporter({ namespace: 'cli.vite', channel: 'console' })`, expand CLI transcript ergonomics, and document the reporter swap. | -                                                             |
| 0.12.2 | Task 54 – Interactivity-aware generators   | ⬜ Planned | Extend CLI scaffolds to emit `data-wp-*` attributes, enqueue `wp.interactivity` dependencies, and document how generated markup composes with `defineInteraction` pipelines after the UI bridge ships.     | [Phase 8 – UI baseline](../../ui/docs/phase-8-ui-baseline.md) |
| 0.13.0 | Task 55 – Phase 9 minor release            | ⬜ Planned | Run the full release checklist once Tasks 53‑54 land, regenerate docs, and align the CLI/monorepo changelogs for the 0.13.0 cut.                                                                           | -                                                             |

## Definition of "MVP"

We consider the CLI ready for the MVP launch when the following are true:

1. Builders emit AST-driven artefacts for every supported storage mode (wp-post, wp-taxonomy, wp-option, transient) and blocks.
2. Block generation runs through the next pipeline (manifests/registrars/render templates) with no reliance on string-based printers.
3. `wpk apply` updates user shims that extend generated classes, honours all safety flags, and logs actions.
4. Pipeline helpers expose configuration hooks (e.g., PHP driver options) without deep imports, and integration tests cover end-to-end `generate` + `apply` flows using the real PHP driver (no stubs) so the pretty-printer path is exercised during audits.
5. All documentation (`cli-migration-phases.md`, `php-ast-migration-tasks.md`, `apply-workflow-phases.md`, `adapter-dx.md`, `pipeline-integration-tasks.md`, `core/docs/**`) reflects the current architecture.

## Task evaluation workflow

When opening any task below, instruct the agent as follows:

```
Evaluate {Task Name} #{Task ID}. Read all linked documentation and consider the scope of work. Look at the current state and tell me if this can be completed in a single run. Otherwise, propose a scoped plan to complete it in smaller steps.
```

Before coding, the agent must review `AGENTS.md`, the referenced documentation, and the code paths noted in the task. Every task assumes the pipeline (`packages/cli/src/**`) is the only surface to touch-do not revive string-based printers or helper naming patterns reserved for the pipeline (e.g., no new `create*` exports unless they are pipeline helpers).

## Phase catalog

| ID  | Phase                    | Summary & Scope                                                                                                                                                    | Reserved version                        | Required checks                                                               | Detail reference                                                                                           |
| --- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 0   | Harden PHP writer helper | Tasks 1-4 delivered core pipeline stability, AST builder integrity, and PHP driver configurability.                                                                | 0.4.1-0.4.4 (patch band closed)         | Baseline + `pnpm --filter @wpkernel/cli test -- --testPathPatterns writer`    | [Pipeline integration hardening](./pipeline-integration-tasks.md)                                          |
| 1   | wp-option AST parity     | Build wp-option controllers/helpers in `packages/cli/src/builders/php/resource/**`, add tests, update fixtures, retire legacy printers.                            | 0.4.5-0.4.9 → 0.5.0 minor               | Baseline + `pnpm --filter @wpkernel/cli test --testPathPattern=wp-option`     | [PHP AST migration - Phase 1](./php-ast-migration-tasks.md#phase-1--wp-option-storage-parity)              |
| 2   | Transient AST parity     | Port transient controllers/helpers to the AST pipeline with full test coverage, matching prior printer behaviour.                                                  | 0.5.1-0.5.4 → 0.6.0 minor               | Baseline + `pnpm --filter @wpkernel/cli test --testPathPattern=transient`     | [PHP AST migration - Phase 2](./php-ast-migration-tasks.md#phase-2--transient-storage-parity-)             |
| 3   | Blocks builder           | Implement SSR + JS-only block builders, unifying manifests, registrars, and render stubs via shared helpers.                                                       | 0.6.1-0.6.4 → 0.7.0 minor               | Baseline + `pnpm --filter @wpkernel/cli test:coverage`                        | [Blocks builder scope](./pipeline-integration-tasks.md#future-focus--add-blocks-builder-complexity-medium) |
| 4   | Command migration        | Rebuild `apply`, `generate`, `init`, `create`, `start`, `doctor` on the helper-first pipeline and retire string printers.                                          | 0.7.1-0.7.6 → 0.8.0 minor               | Baseline + docs regeneration + regression run                                 | [Command migration plan](./command-migration-plan.md)                                                      |
| 5   | Apply layering & flags   | Emit user extension shims, port `--yes/--backup/--force`, persist `.wpk-apply.log`, and cut the 0.9.0 release.                                                     | 0.8.1-0.8.4 → 0.9.0 minor               | Baseline + end-to-end `wpk apply` smoke run                                   | [Apply workflow phase](./apply-workflow-phases.md)                                                         |
| 6   | Core pipeline alignment  | Tasks 32-36 align CLI docs with the core pipeline orchestration tracked in `packages/core/docs/phase-6-core-pipeline.md.md`.                                       | 0.9.1-0.10.0 (shipped)                  | Baseline + documentation linting                                              | [Phase 6 spec](../core/docs/phase-6-core-pipeline.md.md)                                                   |
| 7   | Plugin bootstrap flow    | Tasks 37-45 publish the bootstrap workspace, loader generator, cleanup, docs, and cut the 0.11.0 release.                                                          | 0.10.1-0.11.0 (reserve before starting) | Baseline + activation smoke (`wpk create && wpk generate && wpk apply --yes`) | [Phase 7 spec](./phase-7-plugin-bootstrap.md)                                                              |
| 8   | UI baseline experience   | Tasks 46-52 land DataViews schema helpers, async UX primitives, interactivity bridges, and observability hooks in `@wpkernel/ui`, culminating in the 0.12.0 minor. | 0.11.1-0.12.0 (reserve before starting) | Baseline + `pnpm --filter @wpkernel/ui test`/`typecheck` + docs sweep         | [`Phase 8 – UI baseline`](../../ui/docs/phase-8-ui-baseline.md)                                            |
| 9   | Post-MVP polish          | Tasks 53-55 carry CLI diagnostics and interactivity-aware scaffolding after the UI baseline ships.                                                                 | 0.12.1-0.13.0 (reserve before starting) | Baseline + CLI reporter smoke + docs refresh                                  | [Phase 9 – Post-MVP polish](#phase-9--post-mvp-polish--planned)                                            |

Each task should be executed independently; if a task proves too large for a single agent run, the agent must scope it into smaller follow-up tasks using the evaluation workflow above.
