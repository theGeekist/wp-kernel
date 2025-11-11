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

### Discoveries (Deep Dive, PLEASE READ!)

#### `packages/cli/*` SLOC table

| Language    |   Files |     Lines |      Code | Comments |   Blanks |
| :---------- | ------: | --------: | --------: | -------: | -------: | --- | ------------------ | ------- | ------- | ------- | ------- | ------- |
| JavaScript  |       6 |       293 |       247 |        5 |       41 |
| JSON        |      11 |       296 |       296 |        0 |        0 |
| PHP         |       1 |        85 |        25 |       51 |        9 |     | TypeScript         | 278     | 51812   | 43082   | 3507    | 5223    |
| **---**     | **---** |   **---** |   **---** |  **---** |  **---** |
| Markdown    |       2 |       363 |         0 |      249 |      114 |     | $\rightarrow$ BASH | 1       | 14      | 7       | 4       | 3       |
| **(Total)** |         |       377 |         7 |      253 |      117 |     | **---**            | **---** | **---** | **---** | **---** | **---** |
| **Total**   | **298** | **52849** | **43650** | **3812** | **5387** |

#### Deep Dives

- `wc -l` confirms the command surfaces remain large—`create.ts` at 327 lines and `init.ts` at 295—while both files share near-identical scaffolding. Each defines `Build*CommandOptions` with the same dependency overrides (workspace, reporter, workflow, readiness), declares matching `Command` fields for `--force`, `--verbose`, `--prefer-registry-versions`, and `--yes`, maintains the same `summary`/`manifest`/`dependencySource` state, and funnels validation failures through `formatInitWorkflowError`. The only functional deltas are `create`'s target/`--skip-install` handling and directory hygiene hooks versus `init`'s git probe (`warnWhenGitMissing`).
- Both commands delegate to `createInitCommandRuntime` with identical dependency bundles, which resolve reporter/workspace contexts and default readiness plans before returning `runWorkflow`. `create` injects a `cwd` override tied to the resolved target root, filters readiness keys when `--skip-install` drops composer/tsx helpers, and runs `ensureCleanDirectory` plus npm installers post-readiness. `init` calls the runtime with the current working directory, removes the `git` helper from the default plan, and performs the git warning pass before invoking readiness.

- Unit suites (`create.command.test.ts` and `init.command.test.ts`) currently stub `createReporterMock`, `makeWorkspaceMock`, and hand-built readiness registries in parallel. Both verify the same readiness key order and summary writes, meaning any runtime extraction will require a shared harness for reporter/workspace fixtures to avoid updating duplicated expectations in two places.
- The helper directory totals **725 SLOC across six modules** (`wc -l`), and every file starts by redefining the same `resolveWorkspaceRoot` fallback chain (`environment.workspaceRoot → workspace.root → environment.cwd`). The function bodies are copy/paste identical in `composer.ts`, `git.ts`, `phpDriver.ts`, `phpRuntime.ts`, `tsxRuntime.ts`, and `workspaceHygiene.ts`, signalling an obvious candidate for a shared utility.
- Each helper wraps upstream behaviour by rebuilding “defaultDependencies” objects instead of reusing a shared factory. Examples include composer’s `{ install }` bridge to `installComposerDependencies`, git’s `{ detectRepository, initRepository }` to the init command, workspace hygiene’s `ensureClean` wrapper, and tsx/php helpers’ `resolve` + `exec` pairs. The boilerplate spans **10–20 lines per helper**, and deviations (like composer’s `installOnPending` flag or tsx’s `npm install/uninstall` pair) are handled ad hoc. Consolidating dependency injection (e.g., via `defineReadinessHelper({ dependencies, overrides })`) would delete this repeated plumbing.
- Status and message handling repeat the same string sets with inconsistent terminology: composer oscillates between “Composer autoload detected/ready/missing,” git returns “Git repository detected/ready/missing,” workspace hygiene toggles “Generated PHP directory clean/Workspace hygiene confirmed,” and php driver/runtime helpers use nearly identical `ready/pending/blocked` transitions. A shared message builder (or even enumerated status constants) would align phrasing and make it easier to localise confirm/detect outputs across helpers.
- Helper state payloads follow the same structural pattern—`workspace`, `workspaceRoot`, resource-specific metadata—but type definitions live inline. Composer/tsx/workspace hygiene all expose a nullable `Workspace`, php runtime/driver supply `workspaceRoot` plus tool metadata, and git tracks `root`. Extracting these into shared `ReadinessState` derivatives would avoid consumers manually duplicating shapes when composing readiness plans.
- The tests mirror the duplication. The helper test folder adds **452 SLOC** with bespoke `buildContext` factories that recreate `DxContext` + reporter wiring in every suite. Composer and tsx tests hand-roll full `Workspace` mocks (15+ methods stubbed with `jest.fn()`), while workspace hygiene tests rebuild similar contexts with slightly different namespace strings. Composer and tsx suites also repeat the same “autoinstall then update exists() to simulate success” flow, making it clear the harness lacks reusable fixtures for workspace state, dependency overrides, and confirmation checks.
- None of the tests exercise cross-helper orchestration; they each stub `createReporter` locally and call `createReadinessHelper` implementations directly. This leaves shared behaviours (like the `createReadinessHelper` contract or registry wiring) untested and suggests Task 56b should add seam-level tests around the shared factory once the duplication is collapsed.
- **TypeScript builder (`packages/cli/src/builders/ts.ts`, 1,371 lines)** – The first 176 lines export nine public interfaces (`TsBuilderEmitOptions` through `ResourceDescriptor`) directly from the orchestration file. `ResourceDescriptor` is re-exported in `builders/index.ts` and consumed by `php/pluginLoader.ts`, so any extraction must keep that type public. The `createTsBuilder` helper (lines 198‑271) hard-codes four creators assembled inline; each creator block ranges from ~140 to 260 lines and repeats the same `loadTsMorph()` spin-up, import resolution (`resolveResourceImport`/`resolveKernelImport`), and `SourceFile` creation/formatting logic. Shared concerns such as namespace sanitisation, runtime fallback messaging, and interactivity feature resolution are duplicated across the admin-screen, dataview fixture, and interactivity fixture creators instead of living in shared utilities under `builders/ts/`. The tail of the file (lines 1,071‑1,299) defines orchestration helpers (`buildProject`, `generateArtifacts`, `notifyAfterEmit`, `buildEmitter`, `runImportValidation`, etc.) that mix reporter messaging with TypeScript formatting; these behaviours are prime candidates for a `./ts/runtime` module that other builders could reuse.
- **Patcher helper (`packages/cli/src/builders/patcher.ts`, 715 lines)** – `createPatcher` begins around line 328 but depends on 300 lines of inline types (`PatchInstruction`, `PatchPlan`, `PatchManifest`, `PatchRecord`) and utilities (`normaliseInstruction`, `readPlan`, `mergeWithGit`, `queueWorkspaceFile`). The git merge implementation shells out via `execFile('git', ['merge-file', …])` with bespoke temp-file wiring, and the manifest bookkeeping (`recordResult`, `recordPlanSkippedDeletions`, `reportDeletionSummary`) embeds reporter phrasing that makes unit tests brittle. Instruction processing functions (`processInstruction`, `processDeleteInstruction`) own both IO (workspace reads/writes) and manifest accounting, suggesting a natural split between plan parsing, git reconciliation, and manifest summarisation modules. Because `createPatcher` also queues writes onto `BuilderOutput`, the orchestrator should ultimately depend on smaller primitives rather than owning workspace mutations directly.
- **PHP resource controller helper (`packages/cli/src/builders/php/resourceController.ts`, 758 lines)** – The helper wires `createHelper` to generate REST controllers but bundles routing, capability analysis, storage helper plumbing, and reporter messaging together. After the main helper (lines 33‑121), the module defines 20+ private functions: storage artefact readers (`buildTaxonomyStorageArtifactsFromState`, etc.), route analysis utilities (`analyseRouteSupport`, `analyseWpPostSupport`, `analyseTransientSupport`), cache-key planners, and fallback logging (`buildFallbackLogContext`). Many of these overlap with existing modules under `packages/cli/src/builders/php/resourceController/` and `storageHelpers.ts`, yet they recreate data-shaping logic locally instead of reusing those exports. The helper also reaches into channel state (`getPhpBuilderChannel`) to queue files, mixing transport concerns with plan construction; splitting orchestration (`queueResourceControllerFiles`) from analysis would let channel mutations live in a dedicated emitter module.
- **Dependent imports and test footprint** – `ResourceDescriptor`'s public export confirms downstream modules already depend on the TypeScript builder types; similar audits show `createPatcher` is imported solely through `builders/index.ts`, while the PHP helper is referenced by the PHP builder barrel. Builder tests underscore the sprawl: `find packages/cli/src/builders -name '*.test.ts' -exec wc -l {} +` totals 10,060 lines, with individual suites far over the 500-line ceiling (`__tests__/patcher.test.ts` 1,228 lines, `php/__tests__/resourceController.test.ts` 784, `ts/__tests__/blocks.test.ts` 688, `__tests__/ts.builder.test.ts` 566). The `patcher` suite rolls its own `withWorkspace` temp-dir helper, `buildReporter`, and manifest assertions instead of using shared fixtures; TypeScript builder tests handcraft ts-morph projects and inline snapshot strings repeatedly. Any modularisation must therefore pair code extraction with fixture consolidation, otherwise test rewrites will remain prohibitive.

- **Test footprint remains monolithic.** The raw `find … | wc -l` sweep shows 26,168 lines of CLI tests, with ten suites already above 600 lines and four breaching 1,000 (`patcher.test.ts`, `pipeline.test.ts`, `wpk-bin.integration.test.ts`, `start.command.test.ts`).【294a42†L1-L30】 This confirms Task 56d must plan wholesale splits rather than incremental trims.
- **Spawn harness duplication persists.** Despite shipping `tests/test-support/runWpk.ts`, the `wpk-bin` integration still re-declares `runProcess`/`RunResult` locally before calling into the helper, and checks full scaffold contents alongside the spawn wrapper.【2680c9†L1-L120】 `create-wpk.integration.test.ts` repeats the same spawn wrapper, NODE_OPTIONS assembly, and inline env sanitisation instead of delegating to a shared bootstrap surface.【c7f6c2†L1-L120】 Even the shared `runWpk` helper contains its own copy of the spawn routine and loader wiring, so we effectively maintain three near-identical process runners.【03ac93†L1-L136】
- **Workspaces and reporters are rebuilt per suite.** The 1,228-line patcher tests hand-roll a temporary workspace factory, builder output queue, and reporter mock rather than consuming `@wpkernel/test-utils` primitives, mirroring the duplication found across command suites.【6df012†L1-L200】 Similar bespoke fixtures surface in `pipeline.test.ts`, which spins up the full workspace runtime and helper graph just to assert ordering, tightening the coupling between the runtime API and test scaffolding.【57b203†L1-L80】
- **Integration assertions bind to full artifact snapshots.** The bin and generate/apply suites assert on entire `package.json`, `composer.json`, PHP apply manifests, and stderr wording, meaning any refactor that changes logging phrasing or manifest structure ripples through hundreds of expectations.【2680c9†L64-L120】【350f4f†L1-L96】 This brittleness explains why prior refactors struggled to land without matching test updates.
- **Command behaviour matrices live in single mega-files.** `start.command.test.ts` alone contains watcher fakery, debounce timing, auto-apply orchestration, and queue prioritisation logic under one `describe`, demonstrating why we need seam-level suites for watch resilience versus apply flows before altering the command implementation.【fa4f12†L1-L120】

- **Command factories are bloated with inline public types.** `packages/cli/src/commands/start.ts` exports four public types and two interfaces (`ChangeTier`, `Trigger`, `FileSystem`, `BuildStartCommandOptions`, plus internal dependency contracts) before any behaviour executes, while also aliasing `createReporterCLI` to `buildReporter` in the same file. The create and doctor commands mirror the pattern: `packages/cli/src/commands/create.ts` defines `BuildCreateCommandOptions`, `CreateCommandInstance`, and `CreateCommandConstructor` alongside dependency wiring, and `packages/cli/src/commands/doctor.ts` declares `DoctorStatus`, `DoctorCheckResult`, and `BuildDoctorCommandOptions` ahead of runtime logic. All three commands expose these shapes through `packages/cli/src/commands/index.ts`, meaning every consumer imports the monolithic command modules just to obtain types.
- **Init runtime concentrates multiple exported interfaces inline.** `packages/cli/src/commands/init/command-runtime.ts` holds `InitCommandRuntimeDependencies`, `InitCommandRuntimeOptions`, `InitCommandRuntimeResult`, and `InitCommandReadinessRuntime` next to `createInitCommandRuntime`. Tests and the create command import these names directly, so any extraction must preserve stable entry points without forcing deep imports.
- **Config validation mixes option/result types with validator construction.** `packages/cli/src/config/validate-wpk-config.ts` defines the public option/result contracts (`ValidateWPKernelConfigOptions`, `ValidateWPKernelConfigResult`, `WPKernelConfigCandidate`) alongside dozens of validator constants. The file’s 500+ lines of rule definitions make it a poor source module for consumers that only need the validation result shape.
- **`create*` verb drift spans builders, commands, and utilities.** Beyond the sanctioned `createHelper`, command surfaces rely on `createInitCommandRuntime`, readiness helpers export `createComposerReadinessHelper`/`createWorkspaceHygieneReadinessHelper`, utilities expose `createModuleResolver`, and even backup tooling ships `createBackups`. The commands partially paper over the mismatch by aliasing `createReporterCLI` to `buildReporter`, but downstream files (builders, IR fragments, readiness registry) still import the `create*` names directly, so refactors must plan coordinated renames or wrapper exports.
- **Public API barrels propagate the current naming scheme.** `packages/cli/src/commands/index.ts` re-exports all of the inline command types, while `packages/cli/src/builders/index.ts` and `packages/cli/src/dx/index.ts` surface the existing `create*` helpers. Documentation under `docs/api/@wpkernel/cli`—which is auto-generated and out of scope for edits—already describes these `create*` signatures, so we'll has to stage renames in a way that keeps the generated docs consistent once the code settles.

### Subtasks

> **Global note for 56:**
> Work under Task 56 is expected to move a lot of test and helper code. During this period, coverage metrics are likely to fluctuate or fail intermittently. This is acceptable as long as tests continue to run and the main DX flows stay exercised. Coverage can be brought back into shape towards the tail end of 56 rather than on every individual run.

#### 56a – Test-utils harness foundation

**Focus**

Work inside `packages/test-utils` to turn it into the primary home for shared test helpers, without yet touching most CLI suites.

**Surfaces**

- Existing helpers in `packages/test-utils` (process runners, workspace helpers, reporter mocks, fixtures).
- The most obvious duplication between `packages/test-utils` and the ad-hoc helpers already identified in CLI tests (run/process wrappers, workspace factories, reporter builders).

**Intent**

- Bring the duplicated logic that already lives _inside_ `packages/test-utils` into a smaller set of coherent helpers.
- Shape these helpers so they can support CLI tests later (process spawning, temp workspaces, reporters), but avoid a broad migration in this step.
- Accept that coverage for `packages/test-utils` may be incomplete after this pass; the priority is having a sane, minimal surface rather than full test coverage.

**Out of scope**

- Large-scale edits to CLI test files.
- Behavioural changes to the CLI itself.
- Forcing coverage thresholds to pass during the refactor.

##### 56a consolidation update – process harnesses

`packages/test-utils/src/integration` now owns the shared process runner (`runProcess`), loader-aware Node flag builder (`buildNodeOptions`), and CLI-aware PHP environment shims (`sanitizePhpIntegrationEnv`, `buildCliIntegrationEnv`). `packages/cli/tests/test-support/runWpk.ts`, `packages/cli/tests/__tests__/wpk-bin.integration.test.ts`, and `packages/cli/tests/__tests__/create-wpk.integration.test.ts` are the first consumers, eliminating their bespoke spawn wrappers while keeping the existing expectations untouched. The next logical seam for Task 56b is to flip the remaining CLI suites (pipeline/start/apply) over to these helpers so the loader/env story stays consistent before we tackle the reporter/workspace refactors in 56c.

---

#### 56b – Integration process runners onto test-utils

**Focus**

Move the process/spawn harness duplication in CLI integration tests onto the consolidated helpers in `packages/test-utils`.

**Surfaces**

- Integration suites that shell out to the CLI (e.g. `wpk-bin`, `create-wpk`, and the shared `runWpk` helper).
- Any local `runProcess` / spawn wrappers that overlap with the discovery notes.

**Intent**

- Replace the three near-identical process runners with a single path via `packages/test-utils`.
- Keep the observable behaviour of the integration tests the same (arguments, env shaping, error handling), even if some internals move.
- Expect coverage numbers in integration suites and `packages/test-utils` to move around; that’s fine as long as tests stay green and still exercise the same flows.

**Out of scope**

- Changing what the integrations assert (still smoke vs snapshot-heavy at this point).
- Touching builder or readiness tests.

##### 56b consolidation update – CLI runner surface

`packages/test-utils/src/integration/process.ts` now exposes `runNodeProcess`, letting CLI suites compose Node loader flags, shared env shims, and `runProcess` in a single hop. The shared `runWpk` helper has switched to the new entry point and `packages/cli/tests/__tests__/create-wpk.integration.test.ts` now hydrates its bootstrap binary with `buildCliIntegrationEnv` + `runNodeProcess`, eliminating the bespoke NODE_OPTIONS juggling in favour of the same loader wiring used by `wpk-bin`. Task 56c can build on this by lifting the repeated git/composer bootstrap logic (e.g. `jest-global-setup` and suite-level `git init` calls) into companion helpers so reporter/workspace migrations do not have to replicate shell management.

---

#### 56c – Workspace and reporter helpers for command and pipeline suites

**Focus**

Lift the repeated workspace + reporter scaffolding used by command and pipeline tests into `packages/test-utils`, then migrate a first batch of suites to use it.

**Surfaces**

- Command test suites (`create`, `init`, `start`, `doctor`, etc.) that recreate temporary workspaces and reporter mocks.
- `pipeline.test.ts` and related DX/pipeline suites that spin up full runtimes just to assert ordering or helper registration.

**Intent**

- Centralise workspace factories, reporter builders, and any basic DX context fixtures in `packages/test-utils`.
- Update a limited, coherent set of suites (commands + pipeline) to use the new helpers, without trying to cover every test file in one go.
- Allow coverage to dip for individual suites during this shuffle; the aim is to reduce duplication and make future refactors cheaper.

**Out of scope**

- Splitting mega-suites or changing test behaviour in a major way (that comes later).
- Any modifications to builder or patcher tests.

##### 56c consolidation update – workspace and reporter harnesses

`@wpkernel/test-utils/cli` now ships `createCommandReporterHarness`, which wraps the shared reporter mock and factory so suites stop instantiating reporters by hand. Coupled with `createCommandWorkspaceHarness`, every command-facing suite touched so far (`start.command.test.ts`, `generate.command.test.ts`, `create.command.test.ts`, `init.command.test.ts`, `init.runtime.test.ts`, `init.workflow.test.ts`, plus the doctor command/environment suites) now relies on the shared reporters/workspace surfaces, and even `apply.helpers.test.ts` leans on the harness for cleanup logging assertions. Task 56d can extend the harness into the builder and pipeline suites so their bespoke reporter/workspace wiring can finally disappear as well.

---

#### 56d – Builder test harness alignment

**Focus**

Apply the `packages/test-utils` workspace/process/reporter helpers to the builder-side tests (TypeScript, patcher, PHP resource controller), where the duplication is heaviest.

**Surfaces**

- `patcher.test.ts`, `ts` builder tests, PHP builder tests, and any local temp-workspace/reporting helpers they define.
- Builder output/manifest assertion helpers that could be shared.

**Intent**

- Move repeated builder fixtures (workspace setup, builder output queues, reporters) into `packages/test-utils`.
- Adjust the large builder suites to consume these helpers, aiming more for simplification than for aggressive suite-splitting in this step.
- Accept that coverage for builders may temporarily fall or shift; getting the tests onto a shared harness has higher value here.

**Out of scope**

- Breaking monolithic builder tests into smaller files (that fits better in a later subtask once the harness is shared).
- Changing the underlying builder logic.

##### 56d consolidation update – builder harness alignment

`@wpkernel/test-utils` now ships a dedicated builder harness entry point (`builders/tests/builder-harness.test-support.ts`) that exposes shared `withWorkspace`, `buildReporter`, `buildOutput`, and path-normalisation helpers. The patcher, plan, bundler, and PHP builder suites have been migrated to the shared harness—removing their local `mkdtemp` helpers and bespoke reporter/output factories—while the existing TS builder fixtures simply re-export the shared helpers. This trims hundreds of duplicated lines across the builder test family and keeps the suites on consistent workspace/reporter mocks ahead of the heavier suite splits planned for Task 56e.

---

#### 56e – Suite shaping for high-churn areas

**Focus**

Trim the worst of the test sprawl in a few high-churn suites now that shared helpers exist: particularly `start.command.test.ts`, `pipeline.test.ts`, and the heaviest integration files.

**Surfaces**

- Oversized suites highlighted in discovery (files over ~1,000 lines, especially `start.command.test.ts`, `pipeline.test.ts`, `patcher.test.ts`, `wpk-bin.integration.test.ts`).
- The new helpers introduced in 56a–56d.

**Intent**

- Split a small number of the most painful suites by behaviour (for example, separating watch/debounce behaviour from apply/manifest checks), guided by the new shared harness.
- Lighten individual files enough that future refactors are less risky, without chasing a perfect test architecture in one go.
- Live with temporary coverage volatility; some paths may gain new tests while others lose redundant ones.

**Out of scope**

- Exhaustive re-authoring of all large suites.
- Enforcing a hard line-count policy across the whole tree.

##### 56e consolidation update – start command decoupling

`start.command.test.ts` now leans on a shared harness (`start.command.test-support.ts`) that drives the mocked generate command, watcher lifecycle, and Vite child processes from one place. The suite dropped roughly 250 lines by replacing bespoke shutdown calls, flush helpers, and reporter plumbing with `withStartCommand`, `advanceFastDebounce`, and `emitChange`, while the chokidar module shape assertions collapsed into a single parameterised block. The start command remains covered end-to-end (watch debounce, auto-apply, Vite orchestration), but each concern now lives in tighter helpers that future pipeline refactors can reuse without copying the 1,200-line fixture blob that previously lived at the bottom of the file. Next up, pipeline and integration suites should adopt similar harnesses so their ordering/error tests can shrink without sacrificing coverage.

##### 56e consolidation update – pipeline + init harnesses

`packages/cli/src/runtime/__tests__/pipeline.test.ts` now runs through a purpose-built harness (`runtime/test-support/pipeline.test-support.ts`) that provisions workspaces, reporters, and default pipeline options in one place. The ordering, extension, and rollback scenarios simply call `withConfiguredPipeline` and inspect the captured steps/results, eliminating dozens of per-test calls to `withWorkspace`, `buildWorkspace`, and `buildEmptyGenerationState`. On the integration side, `packages/cli/tests/__tests__/init.integration.test.ts` consumes a new `withInitWorkflowHarness` helper that seeds disk fixtures and executes `runInitWorkflow` with consistent reporters—dropping the hand-written workspace plumbing while keeping assertions about scaffold summaries and reporter output intact. These reductions trim roughly 150 lines between the two suites and pave the way for the remaining 56e cleanups in the heavier CLI integration files.

##### 56e consolidation update – wpk bin integration helpers

`packages/cli/tests/__tests__/wpk-bin.integration.test.ts` now leans on a shared `expectSuccessfulInit` helper and a `fromWorkspace` path resolver to centralise the boilerplate that previously guarded every `wpk init` call. The helper asserts exit codes and stderr while returning the run payload when stdout needs inspection, and the new resolver collapses repetitive `path.join(workspace, …)` expressions. Together they remove more than forty lines without touching generate/apply coverage, nudging Task 56e’s integration cleanup toward a net SLOC reduction.

##### 56e consolidation update – CLI integration harness

`packages/cli/tests/test-support/cli-integration.test-support.ts` now exposes a `withCliIntegration` harness that threads workspace setup, `runWpk`, path resolution, and the `expectSuccessfulInit` assertion through a single entry point. The `wpk-bin` and `generate-apply` integration suites consume the harness, deleting their bespoke init helpers, ad-hoc `withWorkspace({ chdir: false })` wrappers, and inline `path.join(workspace, …)` plumbing while keeping their behavioural assertions intact. This brings the integration tests onto the shared process surface introduced earlier in Task 56, trims redundant scaffolding across the suites, and leaves no orphaned helpers behind for the next cleanup pass.

---

#### 56f – Readiness helper shared utilities

**Focus**

Reduce boilerplate in DX readiness helpers using shared utilities, now that tests have a common harness and are easier to maintain.

**Surfaces**

- `packages/cli/src/dx/readiness/helpers/*.ts`
- Any new test-utils fixtures that support helper tests.

**Intent**

- Introduce a shared utility module for patterns identified in discovery (workspace resolution, reporter wiring, status/message handling) without changing helper semantics.
- Migrate helpers incrementally to the shared utilities, leaning on the improved helper tests from earlier steps.
- Allow coverage checks to lag behind slightly while helpers move; stability and behaviour parity are more important than perfect numbers here.

**Out of scope**

- Broad refactoring of the readiness registry or DX context beyond what’s needed to share utilities.
- Large changes to helper configuration surfaces.

##### 56f consolidation update – readiness helper fixtures

- Defaulted the readiness test context factory and introduced a shared `createWorkspaceDouble` so helper suites no longer hand-roll reporters/workspaces, cutting ~80 lines while keeping assertions intact.
- Streamlined helper specs to rely on the shared defaults (no explicit namespaces/cwd wiring), matching the runtime behaviour surfaced in Task 55 without adding new production code.

---

#### 56g – Command runtime consolidation

**Focus**

Address the duplication between `create` and `init` by introducing a shared scaffold runtime, now backed by cleaner tests and helpers.

**Surfaces**

- `create.ts`, `init.ts`, and the runtime module they both depend on.
- Command tests already using the shared workspace/reporter helpers.

**Intent**

- Extract a shared runtime layer for Clipanion options, readiness planning, and summary emission while keeping command-specific behaviour (targets, hygiene, git warnings) visible at the edges.
- Keep regression risk low by relying on the harness and command tests refactored earlier in 56.
- Treat any localised coverage regression as acceptable during this pass, as long as the main create/init flows remain covered.

**Out of scope**

- Changing command flags, summaries, or public types beyond what is necessary to share the runtime.

##### 56g consolidation update – shared init/create scaffold

- Dropped the heavyweight scaffold class in favour of a lean `InitCommandBase` plus a `runInitCommand` helper that handle shared Clipanion options, readiness orchestration, and summary wiring without adding a new inheritance layer.
- Reworked `create.ts` and `init.ts` to call the shared helper directly—each command now supplies only its bespoke hooks (target resolution, skip-install filtering, git warnings) while deleting the 230-line `runtime-scaffold.ts` module for a net code reduction.

---

#### 56h – Builder modularisation (patcher / TypeScript / PHP)

**Focus**

Apply the modularisation ideas from discovery to the main builder monoliths, once their tests are on shared helpers and a bit more manageable.

**Surfaces**

- `builders/patcher.ts` and related builder entry points.
- TypeScript builder file(s) and PHP resource controller builder, in line with the earlier analysis.

**Intent**

- Break the most monolithic builders into smaller modules (types/orchestration/emit/runtime) in a way that lines up with existing usage and the updated test harness.
- Avoid changing external behaviour; any differences should be observable only in internal structure and test layouts.
- Accept that some builder areas may temporarily lose fine-grained coverage while tests catch up; the priority is reducing SLOC and simplifying future changes.

**Out of scope**

- Large changes to the IR or generated artifact shapes.
- Expanding test matrices beyond what the current suites already cover.

---

#### 56i – Type and naming alignment

**Focus**

Tidy the public type and naming drift identified in discovery, after structural changes have settled.

**Surfaces**

- Exported types and factories across commands, builders, config validation, and DX readiness.
- Barrel exports that surface public APIs.

**Intent**

- Move inline public types into `types.ts`-style modules per domain, keeping barrel exports as the stable face.
- Smooth out verb usage (`create*` vs `build*` vs `define*`) where it improves clarity, without introducing breaking changes for external consumers.
- Use the now-simplified tests and helpers to confirm that observable behaviour remains consistent.

#### Known constraints & context

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
