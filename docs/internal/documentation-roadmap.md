# Documentation Upgrade Roadmap

This roadmap coordinates the multi-phase uplift of the WPKernel documentation set. It expands the original outline into scoped Docs Phases and Docs Tasks so contributors can plan, staff, and verify work in a predictable order.

## Coordination & guardrails

- **Single source of truth:** This file owns the sequence and scope for every documentation push. Update it first, then reflect the changes in task-specific specs.
- **Docs surface vs. internal notes:** Pages inside `docs/internal/` are hidden from the public build through `srcExclude` in `docs/.vitepress/config.ts`. Use the internal area for planning artefacts only.
- **Content workflow:** When a Docs Task touches executable snippets, run `pnpm lint --fix`, `pnpm typecheck`, and any relevant package-level doc tests before shipping the change.
- **Cross-file references:** Keep navigation indices (`docs/index.md`, `docs/packages/index.md`, contributing guides, etc.) aligned with new or renamed content to avoid orphaned pages.
- **API docs discipline:** All phases rely on authors annotating exports with accurate JSDoc (including `@category` groupings) so the Typedoc output remains navigable.

## Docs phase ledger

| Docs Phase                                            | Status         | Summary                                                                                           | Ledger                                                                  |
| ----------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Docs Phase 1 - Foundational Restructuring and Tooling | ✓ Complete     | Locked the planning surface, restructured navigation, and adopted the baseline API doc strategy.  | [Jump](#docs-phase-1--foundational-restructuring-and-tooling--complete) |
| Docs Phase 2 - `@wpkernel/core` Gold Standard         | 🚧 In Progress | Establishes the reference quality bar across core guides, README, and API docs.                   | [Jump](#docs-phase-2--wpkernelcore-gold-standard--planned)              |
| Docs Phase 3 - `@wpkernel/ui` Documentation           | 🚧 In Progress | Documents ResourceDataView, ActionButton, WPKernelUIProvider and WordPress-native UI primitives.  | [Jump](#docs-phase-3--wpkernelui-documentation--planned)                |
| Docs Phase 4 - `@wpkernel/cli` Documentation          | 🚧 In Progress | Documents CLI generators (init/generate/apply), AST builders, storage modes, and adapters.        | [Jump](#docs-phase-4--wpkernelcli-documentation--planned)               |
| Docs Phase 5 - `@wpkernel/pipeline` Documentation     | 🚧 In Progress | Documents framework-agnostic pipeline primitives: helper system, DAG execution, and extensions.   | [Jump](#docs-phase-5--wpkernelpipeline-documentation--planned)          |
| Docs Phase 6 - `@wpkernel/test-utils` Documentation   | 🚧 In Progress | Documents testing harnesses: WordPress globals, kernel runtime, UI, CLI, and integration helpers. | [Jump](#docs-phase-6--wpkerneltest-utils-documentation--planned)        |
| Docs Phase 7 - `@wpkernel/e2e-utils` Documentation    | 🚧 In Progress | Documents Playwright fixture extensions with kernel-aware resource, store, and event helpers.     | [Jump](#docs-phase-7--wpkernele2e-utils-documentation--planned)         |
| Docs Phase 8 - PHP Transport Packages Documentation   | ⬜ Planned     | Documents PHP bridge orchestration, AST utilities, and WordPress-specific PHP extensions.         | [Jump](#docs-phase-8--php-transport-packages-documentation--planned)    |
| Docs Phase 9 - `@wpkernel/create-wpk` Documentation   | ⬜ Planned     | Documents CLI bootstrap wrapper for npm/pnpm/yarn create conventions with telemetry.              | [Jump](#docs-phase-9--wpkernelcreate-wpk-documentation--planned)        |
| Docs Phase 10 - Cross-Package Integration & Polish    | ⬜ Planned     | Cross-package examples, integration patterns, and documentation quality sweep.                    | [Jump](#docs-phase-10--cross-package-integration--polish--planned)      |

---

### Docs Phase 1 - Foundational Restructuring and Tooling (✓ Complete)

The foundational phase created the scaffolding required to scale the documentation push. All Docs Tasks under this phase have shipped and the resulting assets are live in `main`.

#### Docs Task 1 - Establish the roadmap (✓ Complete)

- [x] Draft the initial roadmap that sequences documentation work across packages (`docs/internal/documentation-roadmap.md`).
- [x] Confirm the internal planning directory is excluded from the public build via `srcExclude: ['internal/*.md']` in `docs/.vitepress/config.ts`.
- [x] Circulate the roadmap by linking it from relevant planning surfaces (e.g., referenced in root `AGENTS.md`).

#### Docs Task 2 - Restructure navigation for packages (✓ Complete)

- [x] Add a dedicated “Packages” item to the global navigation and sidebar inside `docs/.vitepress/config.ts`.
- [x] Seed package landing pages in `docs/packages/*.md`, including `docs/packages/index.md` for the overview and per-package stubs.
- [x] Ensure navigation breadcrumbs point to the package hub from guides and examples that mention specific workspaces.

#### Docs Task 3 - Baseline API documentation strategy (✓ Complete)

- [x] Audit the Typedoc build output and adopt grouping-friendly defaults in `typedoc.json` (`categorizeByGroup`, `kindSortOrder`, `sort`).
- [x] Disable noisy metadata and private surfaces in the Typedoc configuration (`excludePrivate`, `excludeInternal`, `disableSources`) so the generated Markdown mirrors the public API.
- [x] Document the expectation that maintainers provide `@category` tags and focused examples alongside exported symbols so future phases can lean on meaningful grouping.

#### Docs Task 4 - Contributor guidance touchpoints (✓ Complete)

- [x] Update the root planning docs to reference this roadmap (`AGENTS.md`, CLI MVP plan cross-links) so contributors discover it before picking up doc-adjacent work.
- [x] Note the dependency in package-level planning documents where relevant (for example, CLI migration specs now call out documentation coordination).
- [x] Record follow-up actions inside each future Docs Phase so package owners know when their guidance must be synchronized.

---

### Docs Phase 2 - `@wpkernel/core` Gold Standard (🚧 In Progress)

The second phase applies the documentation playbook to `@wpkernel/core`, producing a reference package that illustrates the desired quality bar.

#### Docs Task 5 - JSDoc audit for exported core APIs (✓ Complete)

- [x] Inventory all exports from `packages/core/src/index.ts` and supporting modules to create a tracking checklist.
- [x] Update or add JSDoc blocks with precise descriptions, parameter/return annotations, and `@category` tags for every export.
- [x] Add runnable `@example` snippets where practical and verify them through the core test suite or embedded playground harnesses.

##### Docs Task 5 artifact - Core export checklist

| Category      | Symbols                                                                                                                                                                                                                                           | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Metadata      | `VERSION`, `getWPData`                                                                                                                                                                                                                            | Constants remain unchanged and continue to re-export the global runtime version and WordPress data accessor.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| HTTP          | `fetch`                                                                                                                                                                                                                                           | Transport helper now documents correlation, reporters, and examples with `@category HTTP`. All exports in `packages/core/src/http/index.ts` have JSDoc.                                                                                                                                                                                                                                                                                                                                                                         |
| Resource      | `defineResource`, `createStore`, `normalizeCacheKey`, `matchesCacheKey`, `findMatchingKeys`, `findMatchingKeysMultiple`, `interpolatePath`, `extractPathParams`, `invalidate`, `invalidateAll`                                                    | Added detailed JSDoc with examples and `@category Resource` tags across cache and store helpers. All exports in `packages/core/src/resource/index.ts` have JSDoc.                                                                                                                                                                                                                                                                                                                                                               |
| Actions       | `defineAction`, `createActionMiddleware`, `invokeAction`, `EXECUTE_ACTION_TYPE`                                                                                                                                                                   | Added `@category Actions` metadata and clarified middleware workflow in examples.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Capability    | `defineCapability`, `createCapabilityProxy`                                                                                                                                                                                                       | Added contributor-facing examples and `@category Capability`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Data          | `configureWPKernel`, `registerWPKernelStore`, `wpkEventsPlugin`                                                                                                                                                                                   | Documented runtime configuration patterns with runnable snippets under `@category Data`.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Interactivity | `defineInteraction`                                                                                                                                                                                                                               | Expanded description and categorised under `Interactivity`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Events        | `WPKernelEventBus`, `getWPKernelEventBus`, `setWPKernelEventBus`, `recordResourceDefined`, `removeResourceDefined`, `recordActionDefined`, `getRegisteredResources`, `getRegisteredActions`, `clearRegisteredResources`, `clearRegisteredActions` | Documented shared bus lifecycle with `@category Events` annotations.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Reporter      | `createReporter`, `createNoopReporter`, `getWPKernelReporter`, `setWPKernelReporter`, `clearWPKReporter`                                                                                                                                          | Added guidance on LogLayer usage with `@category Reporter`. All exports in `packages/core/src/reporter/index.ts` have JSDoc.                                                                                                                                                                                                                                                                                                                                                                                                    |
| Namespace     | `resetNamespaceCache`, `sanitizeNamespace`, `detectNamespace`, `getNamespace`, `isValidNamespace`                                                                                                                                                 | Added sanitisation workflow detail and `@category Namespace`. All exports in `packages/core/src/namespace/index.ts` have JSDoc.                                                                                                                                                                                                                                                                                                                                                                                                 |
| Pipeline      | `createHelper`, `createPipeline`, `createPipelineCommit`, `createPipelineRollback`, plus 25+ type exports (Helper, HelperApplyFn, Pipeline, PipelineDiagnostic, etc.)                                                                             | **THE MOST CRITICAL FRAMEWORK COMPONENT**: Powers ALL CLI generators, PHP Driver AST transformations, and core resource/action orchestration. Future standalone `@wpkernel/pipeline` package. Comprehensive JSDoc covering: architecture (3-phase execution, DAG resolution), extension system (pre-run/post-build hooks), atomic operations protocol (commit/rollback), real-world CLI examples, and performance characteristics. Added `@category Pipeline`. All exports in `packages/core/src/pipeline/index.ts` have JSDoc. |
| Contracts     | `ACTION_LIFECYCLE_PHASES`, `WPK_EXIT_CODES`, `serializeWPKernelError`                                                                                                                                                                             | Centralises shared framework contracts. All exports in `packages/core/src/contracts/index.ts` have JSDoc.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Errors        | `WPKernelError`, `TransportError`, `ServerError`, `CapabilityDeniedError`                                                                                                                                                                         | Exports all error types and utilities for consistent error handling. All exports in `packages/core/src/error/index.ts` have JSDoc.                                                                                                                                                                                                                                                                                                                                                                                              |

#### Docs Task 6 - Author segmented guides for core (✓ Complete)

- [x] Draft a plugin developer guide covering installation, configuration, and integration touchpoints under `docs/packages/core/plugin-developers.md` (new).
- [x] Draft a framework contributor guide that explains extension points, lifecycle hooks, and diagnostics under `docs/packages/core/framework-contributors.md` (new).
- [x] Update `docs/packages/index.md` and any guide landing pages to surface both guides with clear audience labeling.

#### Docs Task 7 - Refresh `packages/core/README.md` (🚧 In Progress)

- [ ] Reorganize the README into overview, quick links, and contribution guidance sections, pointing to the new guides and API reference.
- [x] Replace legacy implementation details with references to the pipeline specs to avoid duplication.
- [ ] Validate that badges, build instructions, and package metadata (e.g., npm scope) are current.

#### Docs Task 8 - Apply the API doc strategy to core (🚧 In Progress)

- [x] Tag all relevant exports with `@category` values that map cleanly to end-user concepts before regenerating Typedoc output.
- [x] Configure Typedoc category ordering (via `typedoc.json` `categorizeByGroup` / frontmatter) so core symbols render in a predictable order.
- [ ] Publish the refreshed Markdown under `docs/api/@wpkernel/core/` and update any references in guide pages (**awating Task 7 completion**)

---

<a id="docs-phase-3--wpkernelui-documentation--planned"></a>

### Docs Phase 3 - `@wpkernel/ui` Documentation (🚧 In Progress)

### Docs Phase 3 - `@wpkernel/ui` Documentation (🚧 In Progress)

This phase applies the Phase 2 documentation playbook to `@wpkernel/ui`, which provides WordPress-native UI primitives aligned with wpk resources, actions, and events.

#### Docs Task 9 - JSDoc audit for exported UI APIs (✓ Complete)

- [x] Inventory all exports from `packages/ui/src/index.ts` and supporting modules to create a tracking checklist.
- [x] Update or add JSDoc blocks with precise descriptions, parameter/return annotations, and `@category` tags for every export.
- [x] Add runnable `@example` snippets for component usage patterns, especially ResourceDataView integration and action bindings.

##### Docs Task 9 artifact - UI export checklist

| Category              | Symbols                                                                                           | Notes                                                                                                                                                                                                                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DataViews Integration | `ResourceDataView`, `createResourceDataViewController`, `createDataFormController`                | WordPress DataViews components kernel-aware with capability gating and persisted preferences. All exports in `packages/ui/src/dataviews/index.ts` and its sub-modules have JSDoc.                                                                                                                                 |
| Action Bindings       | `ActionButton`, `useAction`                                                                       | Trigger wpk actions from UI without touching transports directly. All exports in `packages/ui/src/hooks/useAction.ts` have JSDoc.                                                                                                                                                                                 |
| Provider              | `WPKernelUIProvider`, `attachUIBindings`                                                          | Bootstrap and share wpk runtime with React components. All exports in `packages/ui/src/runtime/index.ts` and its sub-modules have JSDoc.                                                                                                                                                                          |
| Utilities             | `useCapability`, `usePrefetcher`, `useHoverPrefetch`, `useVisiblePrefetch`, `useNextPagePrefetch` | Helper hooks and utilities for UI state management. All exports in `packages/ui/src/hooks/useCapability.ts`, `packages/ui/src/hooks/usePrefetcher.ts`, `packages/ui/src/hooks/useHoverPrefetch.ts`, `packages/ui/src/hooks/useVisiblePrefetch.ts`, and `packages/ui/src/hooks/useNextPagePrefetch.ts` have JSDoc. |

#### Docs Task 10 - Author segmented guides for UI (✓ Complete)

- [x] Draft a plugin developer guide covering ResourceDataView setup, action buttons, and admin integration patterns under `docs/packages/ui/plugin-developers.md`.
- [x] Draft a framework contributor guide explaining component architecture, binding contracts, and extension points under `docs/packages/ui/framework-contributors.md`.
- [x] Update `docs/packages/index.md` and relevant guide landing pages to surface both guides with clear audience labeling.

#### Docs Task 11 - Refresh `packages/ui/README.md` (✓ Complete)

- [x] Reorganize the README into overview, quick links, and contribution guidance sections, pointing to the new guides and API reference.
- [x] Emphasize peer dependency requirements (`@wordpress/components`, `@wordpress/dataviews`, React) and reference `pnpm lint:peers`.
- [x] Validate that badges, build instructions, and package metadata are current.

#### Docs Task 12 - Apply the API doc strategy to UI (✓ Complete)

- [x] Tag all relevant exports with `@category` values (DataViews Integration, Action Bindings, Provider, Utilities).
- [x] Configure Typedoc category ordering for UI symbols to prioritize ResourceDataView and action patterns.
- [x] Publish the refreshed Markdown under `docs/api/@wpkernel/ui/` and update any references in guide pages.

---

<a id="docs-phase-4--wpkernelcli-documentation--planned"></a>

### Docs Phase 4 - `@wpkernel/cli` Documentation (🚧 In Progress)

This phase applies the Phase 2 documentation playbook to `@wpkernel/cli`, covering Rails-like generators, code generation pipelines, and developer tooling.

#### Docs Task 13 - JSDoc audit for exported CLI APIs (✓ Complete)

- [x] Inventory all exports from `packages/cli/src/index.ts` and `packages/cli/src/**` (AST builders) to create a tracking checklist.
- [x] Update or add JSDoc blocks with precise descriptions, parameter/return annotations, and `@category` tags for every export.
- [x] Add runnable `@example` snippets for command workflows (`init`, `generate`, `apply`) and adapter extension patterns.

##### Docs Task 13 artifact - CLI export checklist

| Category     | Symbols                                                                                                                 | Notes                                                                                                                                               |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Commands     | `init`, `generate`, `apply`                                                                                             | Core CLI commands with usage examples and flag documentation.                                                                                       |
| Config       | `wpk.config.ts` types, validation                                                                                       | Kernel config schema (`v1`) with storage mode coverage (wp-post, wp-taxonomy, wp-option, transient).                                                |
| AST Builders | TBD                                                                                                                     | PHP AST generation utilities under `src/**` with `@category AST`. All exports in `packages/cli/src/builders/**` have JSDoc.                         |
| Adapters     | Adapter extension contracts                                                                                             | Pipeline extension patterns for custom generation steps. All exports in `packages/cli/src/adapter/**` have JSDoc.                                   |
| CLI          | `VERSION`, `runCli`                                                                                                     | Top-level CLI exports. All exports in `packages/cli/src/index.ts` have JSDoc.                                                                       |
| Workspace    | `ensureCleanDirectory`, `promptConfirm`, `toWorkspaceRelative`, `ensureGeneratedPhpClean`                               | Utilities for managing the workspace. All exports in `packages/cli/src/workspace/utilities.ts` have JSDoc.                                          |
| IR           | `IRv1`, `IRSchema`, `IRResource`, `IRRoute`, `IRCapabilityHint`, `IRBlock`, `IRPhpProject`, `BuildIrOptions`, `buildIr` | Intermediate Representation types and builder. All exports in `packages/cli/src/ir/publicTypes.ts` and `packages/cli/src/ir/buildIr.ts` have JSDoc. |
| Runtime      | All exports from `./runtime`                                                                                            | Re-exports from the runtime module. All exports in `packages/cli/src/runtime/index.ts` and its sub-modules have JSDoc.                              |
| Builders     | All exports from `./builders`                                                                                           | Re-exports from the builders module. All exports in `packages/cli/src/builders/index.ts` and its sub-modules have JSDoc.                            |

#### Docs Task 14 - Author segmented guides for CLI (✓ Complete)

- [x] Draft a plugin developer guide covering the init → generate → apply workflow, storage modes, and common patterns under `docs/packages/cli/plugin-developers.md`.
- [x] Draft a framework contributor guide explaining pipeline architecture, AST generation, adapter extensions, and apply state management under `docs/packages/cli/framework-contributors.md`.
- [x] Update `docs/packages/index.md` and CLI reference pages to surface both guides with clear audience labeling.

#### Docs Task 15 - Refresh `packages/cli/README.md` (✓ Complete)

- [x] Reorganize the README into overview, quick start (init workflow), and command reference sections.
- [x] Link to existing migration specs (`docs/cli-migration-phases.md`, `cli-mvp-plan.md`) for deep dives on architecture decisions.
- [x] Validate that installation instructions, storage mode coverage, and version compatibility notes are current.

#### Docs Task 16 - Apply the API doc strategy to CLI (✓ Complete)

- [x] Tag all relevant exports with `@category` values (Commands, Config, AST, Adapters).
- [x] Configure Typedoc category ordering for CLI symbols to prioritize command workflows and config types.
- [x] Publish the refreshed Markdown under `docs/api/@wpkernel/cli/` and update command reference pages.

---

<a id="docs-phase-5--wpkernelpipeline-documentation--planned"></a>

### Docs Phase 5 - `@wpkernel/pipeline` Documentation (🚧 In Progress)

This phase documents the standalone `@wpkernel/pipeline` package, which provides framework-agnostic pipeline orchestration primitives. The pipeline system was previously embedded in `@wpkernel/core` but is now a separate package used by both core (for resource/action orchestration) and CLI (for code generation).

#### Docs Task 17 - JSDoc audit for exported pipeline APIs (✓ Complete)

- [x] Inventory all exports from `packages/pipeline/src/index.ts` to create a tracking checklist.
- [x] Update or add JSDoc blocks with precise descriptions, parameter/return annotations, and `@category Pipeline` tags for every export.
- [x] Add comprehensive `@example` snippets demonstrating helper creation, pipeline composition, extension system, and commit/rollback patterns.

##### Docs Task 17 artifact - Pipeline export checklist

| Category               | Symbols                                                                                                                                                                          | Notes                                                                                                                                                                                                                                                                                          |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core Pipeline API      | `createPipeline`, `createHelper`, `executeHelpers`                                                                                                                               | Main entry points for pipeline creation and helper execution. Framework-agnostic orchestration primitives.                                                                                                                                                                                     |
| Extension System       | `createPipelineExtension`, `PipelineExtension`, `PipelineExtensionHook`, `PipelineExtensionHookOptions`, `PipelineExtensionHookResult`, `PipelineExtensionRollbackErrorMetadata` | Extension factory and hook system for pre-run/post-build lifecycle integration. `createPipelineExtension` provides ergonomic API for building extensions with setup/hook patterns. Enables atomic operations with commit/rollback support. All exports have JSDoc with comprehensive examples. |
| Helper Types           | `Helper`, `HelperApplyFn`, `HelperDescriptor`, `HelperKind`, `HelperMode`, `CreateHelperOptions`, `HelperApplyOptions`                                                           | Type definitions for helper creation and execution contracts.                                                                                                                                                                                                                                  |
| Pipeline Types         | `Pipeline`, `CreatePipelineOptions`, `PipelineReporter`, `PipelineRunState`, `PipelineStep`                                                                                      | Core pipeline configuration and runtime state types.                                                                                                                                                                                                                                           |
| Diagnostics            | `PipelineDiagnostic`, `ConflictDiagnostic`, `MissingDependencyDiagnostic`, `UnusedHelperDiagnostic`                                                                              | Structured diagnostic types for pipeline validation and dependency resolution issues.                                                                                                                                                                                                          |
| Execution Metadata     | `HelperExecutionSnapshot`, `PipelineExecutionMetadata`, `FragmentFinalizationMetadata`                                                                                           | Runtime metadata tracking which helpers executed, which were skipped, and dependency satisfaction state.                                                                                                                                                                                       |
| Error Handling         | `ErrorFactory`, `createDefaultError`, `createErrorFactory`                                                                                                                       | Pluggable error factory system for domain-specific error types.                                                                                                                                                                                                                                |
| Registration Utilities | `registerHelper`, `registerExtensionHook`, `handleExtensionRegisterResult`                                                                                                       | Low-level utilities for helper and extension registration (used internally by `createPipeline`).                                                                                                                                                                                               |
| Utility Types          | `MaybePromise`                                                                                                                                                                   | Helper type for async-compatible function signatures.                                                                                                                                                                                                                                          |

**Architecture highlights:**

- **3-phase execution model**: Fragment assembly (IR building) → Builder execution (artifact generation) → Extension hooks (commit/rollback)
- **DAG-based dependency resolution**: Helpers declare `dependsOn` constraints; pipeline resolves execution order and validates cycles
- **Extension system**: Pre-run and post-build hooks enable atomic operations (file writes, registry updates) with automatic rollback on failure
- **Framework-agnostic**: No WordPress or kernel-specific dependencies; can be used in any TypeScript codebase requiring orchestrated pipelines
- **Used by**: `@wpkernel/core` (resource/action pipelines), `@wpkernel/cli` (code generation), `@wpkernel/php-json-ast` (PHP AST transformations)

#### Docs Task 18 - Author segmented guides for pipeline (✓ Complete)

- [x] Draft an architecture guide covering the 3-phase execution model, DAG resolution, and extension lifecycle under `docs/packages/pipeline/architecture.md`.
- [x] Draft a framework contributor guide explaining how to create domain-specific pipelines, custom helpers, and extension patterns under `docs/packages/pipeline/framework-contributors.md`.
- [x] Draft a migration guide documenting the transition from `@wpkernel/core/pipeline` to `@wpkernel/pipeline` under `docs/packages/pipeline/migration.md`.
- [x] Update `docs/packages/index.md` to surface pipeline as a foundational package with links to all guides.

#### Docs Task 19 - Refresh `packages/pipeline/README.md` (✓ Complete)

- [x] Reorganize the README into overview, installation, quick start (basic pipeline + helper example), and architecture sections.
- [x] Emphasize framework-agnostic nature and list known consumers (core, CLI, PHP packages).
- [x] Link to architecture guide and framework contributor guide for deep dives.
- [x] Validate that package metadata, peer dependencies, and version compatibility notes are current.

#### Docs Task 20 - Apply the API doc strategy to pipeline (✓ Complete)

- [x] Tag all relevant exports with `@category Pipeline` values that emphasize the execution model and extension system.
- [x] Configure Typedoc category ordering to prioritize core API (`createPipeline`, `createHelper`) followed by extension system.
- [x] Publish the refreshed Markdown under `docs/api/@wpkernel/pipeline/` and update cross-references in core/CLI docs.
- [x] Ensure examples demonstrate both simple pipelines and advanced patterns (extensions, rollback, diagnostics).

---

<a id="docs-phase-6--wpkerneltest-utils-documentation--planned"></a>

### Docs Phase 6 - `@wpkernel/test-utils` Documentation (🚧 In Progress)

This phase applies the Phase 2 documentation playbook to `@wpkernel/test-utils`, which provides shared testing utilities and domain-specific harnesses for the WPKernel monorepo.

#### Docs Task 21 - JSDoc audit for exported test-utils APIs (✓ Complete)

- [ ] Inventory all exports from `packages/test-utils/src/index.ts` and submodules (`core/`, `ui/`, `cli/`, `wp/`, `integration/`) to create a tracking checklist.
- [ ] Update or add JSDoc blocks with precise descriptions, parameter/return annotations, and `@category` tags for every export.
- [ ] Add runnable `@example` snippets demonstrating harness setup patterns for WordPress globals, wpk runtime, and UI testing.

##### Docs Task 21 artifact - test-utils export checklist

| Category          | Symbols                                                                    | Notes                                                                                                                                                                                                                                                                  |
| ----------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WordPress Harness | `createWordPressTestHarness`, `withWordPressData`, `createApiFetchHarness` | Mock `window.wp` globals with deterministic data/hooks/apiFetch for unit tests. All exports in `packages/test-utils/src/core/wp-harness.ts` have JSDoc.                                                                                                                |
| Action Runtime    | `applyActionRuntimeOverrides`, `withActionRuntimeOverrides`                | Mutate `__WP_KERNEL_ACTION_RUNTIME__` safely in tests. All exports in `packages/test-utils/src/core/action-runtime.ts` have JSDoc.                                                                                                                                     |
| UI Harness        | `createWPKernelUITestHarness`                                              | Kernel UI provider + runtime harness with console guards and registry reset helpers. All exports in `packages/test-utils/src/ui/wpkernel-ui-harness.ts` have JSDoc.                                                                                                    |
| CLI Helpers       | `MemoryStream`, command context utilities, reporter mocks                  | Testing utilities for CLI command integration tests. All exports in `packages/test-utils/src/cli/memory-stream.ts`, `packages/test-utils/src/cli/command-context.ts`, `packages/test-utils/src/cli/reporter.ts` and `packages/test-utils/src/cli/flush.ts` have JSDoc. |
| Integration       | `withWorkspace`, `createWorkspaceRunner`                                   | Workspace lifecycle management for integration tests. All exports in `packages/test-utils/src/integration/workspace.ts` and `packages/test-utils/src/integration/php.ts` have JSDoc.                                                                                   |

#### Docs Task 22 - Author segmented guides for test-utils (✓ Complete)

- [x] Draft a testing cookbook covering WordPress harness patterns, wpk runtime setup, and UI component testing under `docs/packages/test-utils/testing-cookbook.md`.
- [x] Draft a framework contributor guide explaining harness architecture, extension patterns, and test-support conventions under `docs/packages/test-utils/framework-contributors.md`.
- [x] Update `docs/packages/index.md` and testing guides to surface both documents with clear use-case labeling.

#### Docs Task 23 - Refresh `packages/test-utils/README.md` (✓ Complete)

- [x] Reorganize the README into overview, installation, and quick start sections covering each harness family.
- [x] Link to the testing cookbook and root `tests/TEST_PATTERNS.md` for comprehensive patterns.
- [x] Validate that Jest configuration examples and harness contracts are current.

#### Docs Task 24 - Apply the API doc strategy to test-utils (✓ Complete)

- [x] Tag all relevant exports with `@category` values (WordPress Harness, Action Runtime, UI Harness, CLI Helpers, Integration).
- [x] Configure Typedoc category ordering to prioritize commonly-used harnesses (WordPress, UI, Integration).
- [x] Publish the refreshed Markdown under `docs/api/@wpkernel/test-utils/` and link from testing guides.

---

<a id="docs-phase-7--wpkernele2e-utils-documentation--planned"></a>

### Docs Phase 7 - `@wpkernel/e2e-utils` Documentation (🚧 In Progress)

This phase applies the Phase 2 documentation playbook to `@wpkernel/e2e-utils`, which extends WordPress Playwright fixtures with kernel-aware E2E testing helpers.

#### Docs Task 25 - JSDoc audit for exported e2e-utils APIs (🚧 In Progress)

- [x] Inventory all exports from `packages/e2e-utils/src/index.ts` and test-support modules to create a tracking checklist.
- [ ] Update or add JSDoc blocks with precise descriptions, parameter/return annotations, and `@category` tags for every export.
- [ ] Add runnable `@example` snippets demonstrating Playwright fixture usage, resource seeding, and event capture patterns.

##### Docs Task 25 artifact - e2e-utils export checklist

| Category         | Symbols                                                           | Notes                                                                                                                             |
| ---------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Test Fixtures    | `test`, `expect`, `createWPKernelUtils`                           | Extended Playwright test with `kernel` fixture pre-configured. All exports in `packages/e2e-utils/src/index.ts` have JSDoc.       |
| Resource Helpers | `seed`, `seedMany`, `remove`, `deleteAll`                         | REST API testing helpers for creating and cleaning up test data.                                                                  |
| Store Utilities  | `wait`, `invalidate`, `getState`                                  | WordPress Data store testing helpers for wpk resources.                                                                           |
| Event Utilities  | Event recorder with pattern matching and capture                  | Kernel event bus testing for JS hooks integration.                                                                                |
| DataView Helpers | `createDataViewHelper`                                            | Playwright helpers for ResourceDataView screens.                                                                                  |
| Test Support     | `withIsolatedWorkspace`, `collectManifestState`, `runNodeSnippet` | Workspace lifecycle, filesystem diffing, and CLI transcript helpers. All exports in `packages/e2e-utils/src/index.ts` have JSDoc. |

#### Docs Task 26 - Author segmented guides for e2e-utils (✓ Complete)

- [x] Draft an E2E testing guide covering Playwright + WordPress fixtures, WPK utilities factory, and showcase app patterns under `docs/packages/e2e-utils/e2e-testing-guide.md`.
- [x] Draft a framework contributor guide explaining fixture extension architecture and validation strategy (real-world testing via showcase) under `docs/packages/e2e-utils/framework-contributors.md`.
- [x] Update `docs/packages/index.md` and E2E testing docs to surface both guides with clear workflow labeling.

#### Docs Task 27 - Refresh `packages/e2e-utils/README.md` (✓ Complete)

- [x] Reorganize the README into overview, installation, and quick start sections emphasizing the optional nature of the package.
- [x] Highlight import patterns (scoped, namespaced, flat) and the `test`/`expect` entry point.
- [x] Validate that Playwright configuration, WordPress fixture integration, and validation strategy notes are current.

#### Docs Task 28 - Apply the API doc strategy to e2e-utils (✓ Complete)

- [x] Tag all relevant exports with `@category` values (Test Fixtures, Resource Helpers, Store Utilities, Event Utilities, DataView Helpers, Test Support).
- [x] Configure Typedoc category ordering to prioritize the test fixture and resource helpers.
- [x] Publish the refreshed Markdown under `docs/api/@wpkernel/e2e-utils/` and link from E2E guides.

---

### Docs Phase 8 - PHP Transport Packages Documentation (⬜ Planned)

This phase documents the PHP-side packages (`php-driver`, `php-json-ast`, `wp-json-ast`) with PHP docblocks, interoperability guides, and README updates.

#### Docs Task 29 - PHP docblock audit for transport packages (✓ Complete)

- [x] Inventory all public PHP classes, functions, and interfaces across `php-driver`, `php-json-ast`, and `wp-json-ast`.
- [x] Add or update PHP docblocks with descriptions, parameter types, return types, and `@category` annotations where applicable.
- [ ] Document TypeScript-PHP interoperability contracts, pretty printer bridge, and autoload resolution patterns.

##### Docs Task 29 artifact - PHP package checklist

| Package      | Components                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| php-driver   | Composer autoload resolution, PhpParser bridge orchestration                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Shared driver for spawning PHP pretty printer with fallback autoload paths. All exports in `packages/php-driver/src/index.ts` have JSDoc.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| php-json-ast | PHP AST JSON utilities, type guards (`isPhpJsonNode`, `normalisePhpAttributes`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Pure PHP AST transport layer (WordPress-agnostic). Experimental builder implementation. All exports in `packages/php-json-ast/src/modifiers.ts` and `packages/php-json-ast/src/nodes/**` have JSDoc.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| wp-json-ast  | **Constants**: `CAPABILITY_PREFIX`, `META_KEY_CACHE_KEYS`, `META_KEY_CREATED_AT`. **Factories**: Term query builders (`wpTermQueryArgsFactory`, `wpTermQueryFactory`). **Docblock Utilities**: Builder helpers for PHP docblock generation. **Request Utilities**: REST request handling (`withValidatedRequestBody`, `buildRestRequestGuard`). **Capability**: Callback builders, enforcement logic, capability lookups, class integration, module orchestration. **Persistence**: WP metadata wrappers and cache integration. **Resource**: Cache invalidation plans, query builders, pagination, WP_Query execution, error guards, storage adapters (Transient, WP_Option, WP_Post), accessor registry. **REST Controller**: Route registration and parameter handling. **Module**: Generated program structure, index file builders. **Blocks**: Module builders, manifest generation, block registration, render callback builders. **Pipeline**: Channel-based coordination for multi-phase artifact generation. **Plugin**: Main entry point builder for wpk plugins. | WordPress-specific AST builders layered on top of `php-json-ast`. Powers the CLI's `wp-post`, `wp-taxonomy`, `wp-option`, and `transient` storage modes. All exports in `packages/wp-json-ast/src/**` have JSDoc with `@category` tags (Constants, Factories, Docblock, Utilities, Capability, Persistence, Resource, REST Controller, Module, Blocks, Pipeline, Plugin). This package encapsulates the WordPress-specific knowledge required for REST controller generation, block integration, capability enforcement, and metadata persistence. Used by `@wpkernel/cli` generators to produce production-ready PHP artifacts that bridge JavaScript resource definitions with WordPress backend infrastructure. |

#### Docs Task 30 - Author interoperability guides for PHP packages (⬜ Planned)

- [ ] Draft a TypeScript-PHP interop guide covering PhpParser bridge, JSON AST serialization, and autoload resolution under `docs/packages/php-interop.md` (new).
- [ ] Document each package's role in the code generation pipeline under `docs/packages/php-driver.md`, `docs/packages/php-json-ast.md`, and `docs/packages/wp-json-ast.md`.
- [ ] Update `docs/packages/index.md` to include PHP package overview with Composer requirements and environment variables (`WPK_PHP_AUTOLOAD`).

#### Docs Task 31 - Refresh PHP package READMEs (⬜ Planned)

- [ ] Reorganize each package README with installation, autoload resolution guidance, and contribution sections.
- [ ] Link to the interop guide and CLI architecture docs for context on the PHP bridge strategy.
- [ ] Validate that Composer requirements (`nikic/php-parser`), WordPress version compatibility, and PHP version constraints are current.

#### Docs Task 32 - Document PHP API surfaces (⬜ Planned)

- [ ] Generate PHP API documentation using phpDocumentor or maintain hand-written API references for public surfaces.
- [ ] Publish PHP API docs under `docs/api/php-driver/`, `docs/api/php-json-ast/`, and `docs/api/wp-json-ast/`.
- [ ] Link from package pages and interop guides to PHP API references, emphasizing the WordPress-agnostic nature of `php-json-ast`.

---

### Docs Phase 9 - `@wpkernel/create-wpk` Documentation (⬜ Planned)

This phase applies the Phase 2 documentation playbook to `@wpkernel/create-wpk`, which provides the bootstrap entry point for the wpk CLI without requiring global installation.

#### Docs Task 33 - JSDoc audit for exported create-wpk APIs (✓ Complete)

- [x] Inventory all exports from `packages/create-wpk/src/index.ts` to create a tracking checklist.
- [x] Update or add JSDoc blocks with precise descriptions, parameter/return annotations, and `@category` tags for every export.
- [ ] Add runnable `@example` snippets demonstrating the create convention workflow and flag forwarding patterns.

##### Docs Task 33 artifact - create-wpk export checklist

| Category    | Symbols                               | Notes                                                                                                                                                                                  |
| ----------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bootstrap   | `create-wpk` binary, CLI shelling     | Forwards arguments to `@wpkernel/cli` with `--skip-install` support. This is a self-contained bootstrap script and does not export any functions or types that require JSDoc comments. |
| Telemetry   | Bootstrap reporter integration        | Usage telemetry under `wpk.cli.bootstrap` namespace aligned with wpk reporter.                                                                                                         |
| Diagnostics | Stdout/stderr capture, error handling | Streams CLI output while capturing buffers for diagnostics.                                                                                                                            |

#### Docs Task 34 - Author segmented guides for create-wpk (⬜ Planned)

- [ ] Draft a quick-start guide covering package manager conventions (`npm create`, `pnpm create`, `yarn create`) and flag forwarding under `docs/packages/create-wpk/quick-start.md` (new).
- [ ] Draft a framework contributor guide explaining the bootstrap binary, CLI integration, and telemetry contracts under `docs/packages/create-wpk/framework-contributors.md` (new).
- [ ] Update `docs/packages/index.md` and getting-started guides to surface create-wpk as the preferred project initialization method.

#### Docs Task 35 - Refresh `packages/create-wpk/README.md` (⬜ Planned)

- [ ] Reorganize the README with installation alternatives (npm/pnpm/yarn), usage patterns, and feature highlights.
- [ ] Link to the quick-start guide and CLI init docs for complete workflow context.
- [ ] Validate that package manager examples, flag forwarding documentation, and diagnostics notes are current.

#### Docs Task 36 - Apply the API doc strategy to create-wpk (⬜ Planned)

- [ ] Tag all relevant exports with `@category` values (Bootstrap, Telemetry, Diagnostics).
- [ ] Configure Typedoc category ordering to prioritize bootstrap entry point and CLI integration.
- [ ] Publish the refreshed Markdown under `docs/api/@wpkernel/create-wpk/` and link from getting-started guides.

---

### Docs Phase 10 - Cross-Package Integration & Polish (⬜ Planned)

This final phase focuses on cross-package integration examples, documentation quality sweeps, and maintenance patterns established during package rollout.

#### Docs Task 37 - Cross-package integration examples (⬜ Planned)

- [ ] Author integration examples showing complete workflows: core + UI + CLI (Resource → DataView → CLI generation) under `docs/examples/integration/` (new).
- [ ] Document testing patterns across packages: test-utils harnesses + e2e-utils fixtures + showcase app validation.
- [ ] Update `docs/examples/index.md` to showcase integration patterns with links to relevant package guides.

#### Docs Task 38 - Documentation quality sweep (⬜ Planned)

- [ ] Audit all package READMEs, guides, and API docs for consistency, broken links, and outdated examples.
- [ ] Run link checkers and validate that internal cross-references remain accurate across packages.
- [ ] Ensure all `@example` snippets are tested or covered by existing test suites (unit, integration, E2E).

#### Docs Task 39 - Establish maintenance patterns (⬜ Planned)

- [ ] Document the documentation update workflow in `docs/contributing/documentation.md` (new), covering JSDoc standards, guide structure, `@category` conventions, and API doc regeneration.
- [ ] Create a checklist for package maintainers to follow when adding new exports or changing public APIs (coordinate with `docs/AGENTS.md`).
- [ ] Schedule periodic documentation reviews (quarterly or per-release) to catch drift and maintain quality standards.

---

Future Docs Phases (such as localization, video tutorials, or community contribution guides) will be appended here once the package rollout stabilizes and new priorities emerge.
