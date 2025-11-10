# Phase 9 – DX Pipeline Integration

> Internal work log for the CLI DX readiness layer. This page tracks discovery notes, helper ownership, and integration progress as the DX orchestration layer comes together under `packages/cli/src/dx/*`.

## Cadence

Phase 9 runs in the 0.12.x band and keeps the `@wpkernel/pipeline` contract untouched. All orchestration work happens inside the CLI package by extending the runtime configured in [`packages/cli/src/runtime/createPipeline.ts`](../packages/cli/src/runtime/createPipeline.ts).

## Task ledger

| Task | Scope                       | Status         | Notes                                                                                                      |
| ---- | --------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------- |
| 53   | Discovery & mapping         | ✅ Complete    | Consolidated command/runtime surfaces and readiness unit inventory.                                        |
| 54   | DXIRv1 foundation           | ✅ Complete    | DX context + readiness registry landed with helpers for git, composer, PHP, tsx, and hygiene.              |
| 55   | Command integration         | ✅ Complete    | Route create/init/doctor/generate/apply through DXIRv1 without regressing workflows.                       |
| 56   | CLI footprint consolidation | 🚧 In progress | Collapse duplicated scaffolding, overgrown modules, and helper boilerplate uncovered in Task 55 discovery. |
| 57   | Reporter & logging          | ⬜ Planned     | Align DX events with existing LogLayer transports and error surfaces.                                      |
| 58   | Validation sweep            | ⬜ Planned     | Exercise the packed CLI (`pnpm pack`) in a temp workspace to confirm readiness idempotency.                |

## Discovery baseline (Task 53)

_This section documents the confirmed surfaces that DXIRv1 will reuse. Updates reflect hands-on inspection rather than assumptions._

### Command entry points

- `wpk create` composes workspace setup, git detection, dependency installers, and init workflow orchestration inside [`packages/cli/src/commands/create.ts`](../packages/cli/src/commands/create.ts). The command already threads dependency hooks for git, npm, and composer installers, which DXIRv1 can wrap instead of rewriting.
- `wpk init` shares its runtime builder with create via [`packages/cli/src/commands/init/command-runtime.ts`](../packages/cli/src/commands/init/command-runtime.ts), exposing a single seam (`createInitCommandRuntime`) that resolves reporters, workspace roots, and workflow options before invoking the init pipeline.
- `wpk doctor` currently executes configuration, composer, workspace hygiene, and PHP environment checks inline inside [`packages/cli/src/commands/doctor.ts`](../packages/cli/src/commands/doctor.ts). Each check produces a `DoctorCheckResult`, which DXIRv1 should emit through the same reporter hierarchy for consistent summaries.
- Config resolution (`loadWPKernelConfig`) already returns both the config payload and source path, enabling DXIRv1 detect phases to derive workspace context without re-parsing configuration files.

### Workspace & installer utilities

- Workspace hygiene helpers (`ensureCleanDirectory`, `ensureGeneratedPhpClean`) encapsulate git status probes and error formatting in [`packages/cli/src/workspace/utilities.ts`](../packages/cli/src/workspace/utilities.ts). They should become readiness units rather than remaining ad-hoc calls.
- Git status and initialisation logic (`isGitRepository`, `initialiseGitRepository`) live in [`packages/cli/src/commands/init/git.ts`](../packages/cli/src/commands/init/git.ts); they depend on `execFile` and surface `WPKernelError` metadata, making them safe to wrap in detect/prepare steps.
- Installer wrappers for npm and composer shell out via `execFile` in [`packages/cli/src/commands/init/installers.ts`](../packages/cli/src/commands/init/installers.ts). DXIRv1 needs to provide detection (lockfile/package-manager choice) ahead of these installers and capture stderr when retries are required.
- PHP environment checks in `doctor` call `execFile` directly to inspect binaries. This behaviour must be lifted into a helper so `generate` and `apply` can reuse the confirm step before launching PHP-based printers.

### Reporter stack

- CLI commands standardise on `createReporterCLI`, which binds LogLayer transports (pretty terminal + hooks) in [`packages/cli/src/utils/reporter.ts`](../packages/cli/src/utils/reporter.ts). DXIRv1 should build child reporters from this helper so detect/prepare/execute/confirm messages inherit the same namespace and metadata expectations.
- Existing reporter children (`reporter.child('composer')`, etc.) in `doctor` provide precedents for nested DX sections. Mirroring that shape will keep console summaries and hook payloads compatible with current consumers.

### Pipeline contract reuse

- The CLI runtime wraps `@wpkernel/pipeline` through [`packages/cli/src/runtime/createPipeline.ts`](../packages/cli/src/runtime/createPipeline.ts). DXIRv1 should follow the same pattern: extend context at the call site and let helpers participate through extension hooks instead of changing shared pipeline types.
- Helpers can piggyback on the existing extension commit/rollback semantics surfaced by the runtime. No new transaction layer is required—only well-scoped readiness helpers that register their side effects.

## Package manager and lockfile behaviour (Task 53)

Existing installers always run `npm install` and `composer install` directly; there is no package-manager detection, lockfile preference, or lazy dependency planner today. DXIRv1 must add a detect phase that:

1. Identifies the active Node package manager and lockfile strategy.
2. Skips redundant installs when lockfiles already reflect the requested dependencies.
3. Records how readiness execution installs lazy assets (for example, `tsx`) so replays remain idempotent.

Any additional hooks (e.g., pnpm support) should be noted here as they are discovered.

## Readiness unit inventory (Task 53)

| Readiness unit      | Current location                                 | Behaviour today                                                                                    | Gaps / brittleness                                                          | Proposed DXIRv1 owner                                                         |
| ------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `php-runtime`       | Doctor command (PHP checks inline)               | Invokes PHP binaries via `execFile` and reports pass/warn/fail directly.                           | Hard-coded command wiring; no reuse by create/init/generate.                | Dedicated helper under `dx/readiness/phpRuntime`.                             |
| `composer`          | Doctor + init installers                         | Composer install only runs during create/init; doctor just confirms autoload presence.             | No detection/skip logic; failing installs throw generic `DeveloperError`.   | Helper that detects composer availability and installs autoload when missing. |
| `php-driver`        | Doctor (composer autoload) & runtime assumptions | Relies on `@wpkernel/php-driver` being present in node_modules/vendor without packaging awareness. | Published CLI missed PHP driver assets; no detection before generate/apply. | Helper that validates bundled assets and backfills via composer if missing.   |
| `tsx-runtime`       | Implicit expectation in CLI runtime              | No installer; commands assume `tsx` is in devDependencies.                                         | Scaffolded projects fail immediately because tsx is absent.                 | Helper that installs or prompts for tsx during prepare/execute.               |
| `git`               | Workspace utilities                              | `ensureCleanDirectory` and `isGitRepository` throw WPKernel errors on failure.                     | Checks run in different places, no central reporting or confirm step.       | Helper that consolidates git detection and repository initialisation.         |
| `workspace-hygiene` | Workspace utilities + doctor                     | Cleanliness checks exist but are triggered ad-hoc.                                                 | Duplicate logging formats and inconsistent skip flags (`--yes`).            | Helper that standardises detection and confirm messaging.                     |

## Published artifact validation

All downstream integration and validation tasks must exercise the packed CLI (`pnpm pack` + local install) inside a fresh temp workspace. This prevents the source-tree bias that hid missing PHP driver assets in earlier integration runs.

## Task 54 – DXIRv1 foundation (complete)

- Added a dedicated DX context (`packages/cli/src/dx/context.ts`) that threads cwd, workspace roots, and `WPK_CLI_FORCE_SOURCE` into readiness helpers.
- Introduced the readiness helper factory and registry (`packages/cli/src/dx/readiness/*`), enabling detect → prepare → execute → confirm orchestration with rollback/cleanup handling.
- Wrapped existing git, composer, PHP runtime/driver, tsx runtime, and workspace hygiene logic into deterministic helpers under `packages/cli/src/dx/readiness/helpers/`.
- Landed Jest coverage for the registry planner and each helper to lock in dependency injection seams ahead of command integration.

## Task 55 – Command integration

### Subtask ledger

| Subtask | Scope                                                                                                                                                                                                                                                                                                           | Status      | Notes                                                                                                                                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 55a     | Extend `createInitCommandRuntime` to build a DX context and readiness registry before invoking the init workflow. Touches `packages/cli/src/commands/init/command-runtime.ts` and `packages/cli/src/dx/readiness/*` to expose a `runReadiness` seam for commands.                                               | ✅ Complete | Registry builder + DX context now surface `readiness.run`/`plan` with default helper order for downstream commands.                                                          |
| 55b     | Route `create`/`init` through the readiness plan, mapping flags such as `--skip-install`/`--yes` onto helper configuration. Update command orchestration in `packages/cli/src/commands/create.ts` and `packages/cli/src/commands/init.ts`, adding regression tests under `packages/cli/src/commands/__tests__`. | ✅ Complete | Commands now execute readiness plans after scaffolding, honouring skip/install flags and surfacing hygiene overrides while keeping existing summaries and exit codes intact. |
| 55c     | Wrap `doctor` health checks with readiness helpers so reporter output stays consistent while leveraging the shared registry. Work centers on `packages/cli/src/commands/doctor.ts` with coverage in `packages/cli/src/commands/__tests__/doctor*.test.ts`.                                                      | ✅ Complete | Doctor now funnels composer, workspace, and PHP diagnostics through the readiness registry while preserving config/composer mapping summaries.                               |
| 55d     | Add targeted readiness entry points for `generate`/`apply` flows, triggering php-driver and tsx helpers on demand. Update command modules in `packages/cli/src/commands/generate.ts` and `packages/cli/src/commands/apply.ts`, plus integration fixtures in `packages/cli/tests`.                               | ✅ Complete | Commands now invoke readiness plans to ensure PHP driver assets and tsx are available before execution, with integration suites covering the new checks.                     |

## Task 56 – CLI footprint consolidation

### Intent

Task 56 attacks the 51,812 TypeScript lines that `tokei` reports in `packages/cli`, with particular focus on the command scaffolding and readiness layer that ballooned during Tasks 54–55. The goal is to drive meaningful SLOC reductions by consolidating duplicated runtimes, shrinking monolithic builders (`ts.ts` at 1,371 lines, `patcher.ts` at 715 lines, `php/resourceController.ts` at 758 lines), and replacing helper boilerplate with shared utilities while preserving behaviour.

### Scope guardrails

- Keep behavioural regressions off the table by landing changes behind existing command tests and readiness suites; expand coverage where splits introduce new seams.
- Use the existing DX readiness registry as the seam for new helpers/utilities instead of inventing parallel abstractions.
- Coordinate any workflow renames with the docs index and MVP plan so later phases have consistent terminology.

### Subtasks

#### 56a – Command runtime consolidation

**Discovery**

1. Produce an architectural diff of `packages/cli/src/commands/create.ts` (327 lines) and `packages/cli/src/commands/init.ts` (295 lines) to catalogue duplicated Clipanion options, summary formatting, and readiness wiring.
2. Trace the call graph inside `packages/cli/src/commands/init/command-runtime.ts` (190 lines) to map the seams that both commands use today and list any divergent code paths (e.g., clean-directory checks vs. git warnings).
3. Inventory reporter usage across create/init tests (`packages/cli/src/commands/__tests__/*`) to ensure output expectations are captured before refactoring.

**Discovery findings (2024-05-08)**

- `wc -l` confirms the command surfaces remain large—`create.ts` at 327 lines and `init.ts` at 295—while both files share near-identical scaffolding. Each defines `Build*CommandOptions` with the same dependency overrides (workspace, reporter, workflow, readiness), declares matching `Command` fields for `--force`, `--verbose`, `--prefer-registry-versions`, and `--yes`, maintains the same `summary`/`manifest`/`dependencySource` state, and funnels validation failures through `formatInitWorkflowError`. The only functional deltas are `create`'s target/`--skip-install` handling and directory hygiene hooks versus `init`'s git probe (`warnWhenGitMissing`).
- Both commands delegate to `createInitCommandRuntime` with identical dependency bundles, which resolve reporter/workspace contexts and default readiness plans before returning `runWorkflow`. `create` injects a `cwd` override tied to the resolved target root, filters readiness keys when `--skip-install` drops composer/tsx helpers, and runs `ensureCleanDirectory` plus npm installers post-readiness. `init` calls the runtime with the current working directory, removes the `git` helper from the default plan, and performs the git warning pass before invoking readiness.
- Unit suites (`create.command.test.ts` and `init.command.test.ts`) currently stub `createReporterMock`, `makeWorkspaceMock`, and hand-built readiness registries in parallel. Both verify the same readiness key order and summary writes, meaning any runtime extraction will require a shared harness for reporter/workspace fixtures to avoid updating duplicated expectations in two places.

**Refactor scope**

- Extract a shared scaffold runtime module (proposed location: `packages/cli/src/commands/scaffold/runtime.ts`) that owns Clipanion option declarations, readiness planning, and summary emission.
- Collapse the existing command modules down to thin wrappers that provide command-specific preflight hooks (directory hygiene vs. git initialisation) and pass them to the shared runtime.
- Introduce regression tests that assert the shared runtime handles `--skip-install`, `--yes`, and failure paths uniformly, replacing bespoke fixtures where duplication previously lived.

#### 56b – Readiness helper harmonisation

**Discovery**

1. Document the common lifecycle shared by helpers in `packages/cli/src/dx/readiness/helpers/*.ts`, noting repeated utilities such as `resolveWorkspaceRoot` (present in composer/git/phpRuntime/phpDriver/tsxRuntime/workspaceHygiene) and duplicated reporter message scaffolding.
2. Capture the configuration surface each helper expects today (flags, auto-run defaults, rollback behaviour) so that a shared factory can reproduce them without breaking type inference.
3. Review helper test suites (e.g., `packages/cli/src/dx/readiness/helpers/__tests__/composer.test.ts`) to list duplicated fixture builders or repeated planner setups that a utility module could centralise.

**Refactor scope**

- Add a `packages/cli/src/dx/readiness/shared.ts` module that exports `defineReadinessHelper`, `resolveWorkspaceRoot`, and shared reporter helpers so individual modules shrink to dependency descriptors.
- Update each helper to consume the shared utilities, deleting inline copies of workspace resolution, reporter scaffolding, and detect/confirm wiring.
- Replace redundant test fixtures with shared builders that live alongside the new shared module, ensuring coverage still exercises helper-specific branches (installer retry, hygiene skips, etc.).

#### 56c – Builder modularisation

**Discovery**

1. Segment `packages/cli/src/builders/ts.ts` (1,371 lines) into logical sections—type declarations, hook registration, manifest generation, emit routines—capturing the precise ranges that can graduate into dedicated modules.
2. Perform the same segmentation for `packages/cli/src/builders/patcher.ts` (715 lines) and `packages/cli/src/builders/php/resourceController.ts` (758 lines), noting shared helpers that already exist (`packages/cli/src/builders/php/shared.ts`, etc.) versus logic that still lives inline.
3. Audit dependent imports to understand how widely each internal type is consumed, so extracted modules expose stable entry points without creating circular dependencies.

**Refactor scope**

- Introduce `types.ts`, `hooks.ts`, and per-artifact emitter modules under `packages/cli/src/builders/ts/` and wire them through the existing barrel exports.
- Split the patcher into orchestration (`patcher/index.ts`) and mutation primitives to keep business logic under 500 lines while isolating test seams.
- Decompose the PHP resource controller builder into smaller modules (routing, capability guards, persistence wiring) that align with the PHP builder directory structure, updating tests to target the new seams.

#### 56d – Test strategy redesign & consolidation

**Discovery**

1. Baseline the suite footprint by scripting `find packages/cli -name '*.test.ts' -exec wc -l {}` so we track every file over the 500‑line guideline (`patcher.test.ts` 1,228 lines, `pipeline.test.ts` 1,222 lines, `start.command.test.ts` 1,077 lines). Capture the output in this log so subsequent phases can prove the count drops as suites are split.
2. Catalogue duplicated harness code and environment bootstrapping. The `wpk-bin` and `create-wpk` integrations both inline a `runProcess` wrapper and bespoke NODE_OPTIONS logic instead of consuming the shared loader (`tests/__tests__/wpk-bin.integration.test.ts` lines 1‑120; `create-wpk.integration.test.ts` lines 1‑120). List every occurrence of this pattern and note which helpers (e.g., `tests/test-support/runWpk.ts`) already exist.
3. Map high-churn seams that need targeted coverage. `pipeline.test.ts` currently exercises the entire helper graph with full workspace setup (lines 1‑153) and `start.command.test.ts` drives debounce/watch behaviour with massive inline fixtures (lines 1‑120). Document which behaviours belong in seam-level tests versus true E2E coverage, and record any fixtures we can lift into reusable builders.
4. Inventory integration expectations that assert on generated artifacts verbatim (e.g., workspace file snapshots, composer manifests) and decide which need to stay end-to-end smoke checks versus ones that can shift to builder-focused suites.

**Refactor scope**

- Introduce a layered harness under `packages/cli/tests/test-support/`:
    - `process.ts` exposes `runCliBinary`/`runCreateWpk` using shared spawn logic and NODE_OPTIONS shaping so individual tests stop re-declaring `runProcess`.
    - `workspace.ts` wraps `withWorkspace` with opinionated defaults (fixtures, env shims) for command suites.
    - `reporter.ts`/`fixtures.ts` host reporter mocks and manifest builders used across readiness, command, and builder tests.
- Split oversized suites by behaviour:
    - Break `start.command.test.ts` into `start.watch.test.ts` (debounce + watcher resilience) and `start.apply.test.ts` (auto-apply + manifest sync) fed by the new harness.
    - Divide `pipeline.test.ts` into helper-registration tests (pure unit) and workspace orchestration tests (lightweight seam) to avoid setting up the full IR in every case.
    - Move PHP/TypeScript artifact assertions from the integration suites into builder-specific tests backed by extracted fixtures.
- Reduce integration suites to smoke coverage. Keep a single happy-path `wpk-bin` run per command plus one failure scenario, relying on seam tests for exhaustive matrix coverage. Ensure create-wpk integration focuses on argument forwarding rather than file snapshotting now handled by builders.
- Update this document and the package README with the new harness locations plus guidance on when to write seam versus E2E tests.

**Execution plan**

1. **Harness foundation** – Add the shared `process`, `workspace`, and reporter fixture modules, migrate `wpk-bin`/`create-wpk` to them, and delete duplicated inline helpers.
2. **Command & readiness seams** – Rewrite the create/init/start/doctor command suites to use the new harness, extracting repeated reporter expectations and workspace scaffolding into focused helpers.
3. **Builder modular tests** – As Task 56c splits builders, mirror the seams in their tests (IR fragments, PHP emitters, patchers) so integration suites no longer need to assert on generated file contents.
4. **Integration trim & guardrails** – Collapse the remaining bin integrations into smoke tests, add lint rules or Jest config to flag suites exceeding 500 lines, and document the stratified coverage model (unit → seam → smoke) here for future contributors.

#### 56e – Type and naming alignment

**Discovery**

1. Catalogue all exported interfaces and type aliases declared inline within orchestration files (builders, commands, config validation) to decide which belong in co-located `types.ts` modules.
2. Inventory functions that violate the naming cadence (e.g., `createInitCommandRuntime`, `createComposerReadinessHelper`, `createReporterCLI as buildReporter`) and note their call sites.
3. Confirm there are no consumers outside `packages/cli` relying on the existing names without re-exports, so renames can be centralised without breaking public APIs.

**Refactor scope**

- Extract shared types into dedicated modules per domain (`builders/ts/types.ts`, `commands/init/types.ts`, `config/validate/types.ts`) and re-export them through existing barrels.
- Standardise verbs: reserve `create*` for `createHelper` factories, adopt `build*` or `define*` for command/runtime constructors, and update imports/tests accordingly.
- Ensure documentation and inline comments reflect the new naming scheme to prevent drift during future phases.

### Known constraints & context

- The `docs/api` tree under `packages/cli` is auto-generated; Task 56 must not modify those files.
- Current integration tests are red; stabilising them is outside Task 56 scope but any new fixtures should account for the ongoing failures so we can re-enable the suites later without rewriting work.

## Task 57 – Reporter & logging alignment

- Emit detect/prepare/execute/confirm phases through `createReporterCLI` child reporters, ensuring LogLayer transports and hook payloads match existing consumers.
- Provide concise status updates (start, success, warning, failure) per readiness unit without dumping raw diagnostic objects. Reuse existing formatting helpers where available.
- Document the new reporter channels/events in this file so future tasks can reference the canonical surface.

## Task 58 – Validation sweep

- Use `pnpm pack` to build the CLI tarball, install it into a temporary directory, and run `npx @wpkernel/wpk` end-to-end to confirm readiness orchestration before `generate` executes.
- Re-run the workflow in the same temp workspace to assert idempotency (detect should short-circuit; confirm should report clean state).
- Capture any residual gaps (missing helpers, installer edge cases, packaging issues) in the documentation along with recommended follow-up tasks or IRv1 extensions.
