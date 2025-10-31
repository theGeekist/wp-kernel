# CLI AST Reduction Plan for `@wpkernel/wp-json-ast`

## Purpose

We are shifting the CLI away from hand-built PHP nodes so that WordPress-aware logic lives in `@wpkernel/wp-json-ast` while the CLI composes higher-level pipelines. Documenting the path keeps follow-on tasks aligned and ensures every phase leaves the tooling fully usable yet better prepared for the next refinement.

## Current Observations

The CLI entry points coordinate a deep stack of helper modules that all reach directly into `@wpkernel/php-json-ast`, so even WordPress-specific behaviours are assembled with low-level node builders. Helpers such as the base controller blend `createWpPhpFileBuilder` with explicit `buildClass`, `buildMethodCall`, and `buildReturn` calls to emit a single method, and the resource controller helper inlines nearly all REST controller structure, from docblocks to route method wiring. Capability generation mirrors this pattern by crafting docblocks, closures, WP_Error guards, and serialised payloads from scratch. Supporting utilities that represent canonical WordPress semantics (for example WP_Error early returns, REST request parameter extraction, taxonomy helpers) also live in the CLI and stitch together raw AST nodes, duplicating work whenever another package needs the same construct.

## Opportunities

`@wpkernel/wp-json-ast` already extends the generic program and file builders with auto-guard metadata, so it is the natural home for reusable WordPress composition. It centralises docblock capability helpers yet currently exports only a thin layer of WordPress factories, like the term query instantiation helper. By expanding this surface to cover REST controllers, capability helpers, WP_Error flows, and request plumbing, the CLI can delegate to WordPress-aware factories and avoid repeating low-level AST assembly. With those factories in place, CLI helpers become thin adapters that translate intermediate representations into declarative inputs and receive ready-to-use builders or AST fragments in return.

## Implementation Guardrails

- **Naming discipline:** Reserve the `create*` prefix for pipeline functions that extend the `createHelper` family. All other exports must use the `build*` prefix; when migrating existing helpers, rename any non-pipeline `create*` utilities encountered in the CLI before resettling them in `wp-json-ast`.
- **Complexity budget:** Newly migrated functions should return early, avoid deep nesting, and keep branch counts small. Extract internal helpers (exported for unit testing) whenever the logic would otherwise exceed a few simple steps.
- **Testability:** Each exported helper must have focused unit tests, with shared utilities exported explicitly for testing. Integration suites in the CLI should verify end-to-end wiring once the CLI consumes the new surface.
- **File size limits:** Maintain ≤500 source lines of code per module or test file. Split large helpers during migration so the destination modules respect this ceiling.

## Phased Roadmap

Each phase groups several single-cycle tasks. Completing a phase leaves the CLI functional while reducing duplication and improving the abstractions available for the next phase.

All task owners must update the relevant "Completion" placeholder with a link to their change once the task ships so the roadmap remains trustworthy.

### Phase 1 - Capture and Benchmark Current Usage

_Task 1.1: Catalogue WordPress-centric builders._ Document every CLI helper under `packages/cli/src/next/builders/php/**` that imports `@wpkernel/php-json-ast`, noting the WordPress behaviour it implements and the inputs it consumes. The output should be an inventory table within this docs folder so future tasks can claim specific helpers.

#### Task 1.1 Inventory - Summary

Captured the full CLI surface that touches `@wpkernel/php-json-ast`, grouped across:

- **Pipeline orchestration** (builder, channel, writer)
- **Core files** (base controller, index, persistence registry, capabilities)
- **Resource controllers & shared utilities**
- **WP_Post resources** (identity, list, meta/tax, mutations)
- **WP_Option / transient / taxonomy** resources
- **Blocks (SSR)** (manifest, registrar, render stubs)

Each entry recorded: **Exports**, **WordPress behaviour**, and **Inputs consumed**.  
The detailed tables are archived to keep this doc focused on the roadmap.

> Full inventory tables are archived in `archive/task-1.1-inventory-full.md`.

_Completion:_ ☑ Completed - Documented every php-json-ast-consuming CLI helper with WordPress semantics and inputs.
_Task 1.2: Identify shared semantics._ Write short briefs for cross-cutting WordPress concerns-such as WP_Error handling, REST request plumbing, taxonomy utilities, and capability scaffolding-highlighting the AST patterns that repeat. These briefs will guide the shape of future `wp-json-ast` factories.

#### Task 1.2 Briefs - Shared WordPress semantics

**WP_Error guard rails.** Controllers and capabilities layer consistent error handling by composing `buildReturnIfWpError`, `buildIsWpErrorGuard`, and `buildWpErrorReturn`. The CLI always wraps potentially failing calls-such as `Capability::enforce`, transient writes, or taxonomy lookups-in an `is_wp_error` conditional that immediately returns the same expression. When constructing new errors, helpers emit `new WP_Error` nodes with a structured payload array so HTTP status codes survive transport through `@wpkernel/php-json-ast`.

**REST request plumbing.** Route handlers never reach into `$_REQUEST`; they pull inputs from the injected `WP_REST_Request` via `buildRequestParamAssignmentStatement`. That helper emits `$request->get_param()` calls, optional scalar casts, and variable reassignments so downstream logic can rely on typed local variables. Schema-driven defaults flow through `buildRestArgs` and `renderPhpValue`, ensuring every controller shares the same argument arrays when registering routes.

**Capability scaffolding and callbacks.** The capability helper assembles a final `Capability` class by combining static map lookups, closure factories, and enforcement guards. It repeatedly emits `Capability::enforce( $key, $request )` static calls, wraps the result in the WP_Error guard, and delegates callback creation through `buildClosure` and `buildClosureUse`. Future factories should expose these structural pieces-directives, fallback resolution, and request-aware closures-as first-class builders.

**Taxonomy term resolution.** Taxonomy-aware controllers rely on helper methods that stage a taxonomy slug, resolve identities with `get_term`, and normalise `WP_Term` objects into associative arrays. The AST patterns blend variable normalisation, scalar casts, and early WP_Error returns when `get_term` fails or the resolved term lacks expected properties. These same utilities also build `WP_Term_Query` invocations for list endpoints, so a shared factory should emit the query, guard, and response-normalisation blocks together.

**Shared identity & cache metadata.** Regardless of storage mode, controllers derive route-aware cache segments and identity values through helpers that write to `$metadataHost`. They emit docblocks tagged with `@wp-kernel` annotations, add `use` statements for shared services (`Capability`, `WP_Error`, identity types), and seed per-route metadata objects. A reusable factory can ingest the route metadata and generate docblock arrays, cache segment lookups, and metadata mutations without repeating node assembly in each controller.

_Completion:_ ☑ Completed - Documented shared WordPress semantics and recurring AST patterns to target with factories.

_Phase outcome:_ We gain a shared vocabulary for the existing surface area and a documented backlog that other agents can pull from without rediscovering the same helpers.

### Phase 2 - Establish WordPress Factories in `wp-json-ast`

_Task 2.1: Introduce focused factory modules._ For one concern at a time (for example REST controllers), move the reusable assembly logic into `packages/wp-json-ast/src/<concern>/` and expose exports that accept configuration objects instead of raw builders. Each task should migrate a coherent helper set plus unit tests, keeping the CLI delegating through the new API.

#### Task 2.1 Blueprint - REST controllers

The first migration wave will extract the REST controller surface from the CLI so that `@wpkernel/wp-json-ast` owns the WordPress semantics. The destination namespace will live under `packages/wp-json-ast/src/rest-controller/` and export two layers.

`buildRestControllerModule` returns a structured module description containing `PhpProgram` payloads for the abstract base controller, each resource controller class, and the registrar index. It accepts a configuration object that mirrors the existing IR envelope: the plugin namespace, the base namespace fragments, and a collection of resource descriptors that already power the CLI builders. The helper will stitch together base imports, docblocks, controller class declarations, and generated route methods.

`buildRestRoute` exposes the reusable AST for individual route methods. It receives a resource slug, capability references, route metadata, and the prepared request schema. The factory will create the method signature, inject the `$request` parameter, and defer to helper callbacks for each route-kind (collection, singular, custom actions). This layer keeps route-specific logic modular while ensuring the docblock annotations and metadata host wiring follow a single implementation.

Supporting utilities that previously lived in the CLI move alongside these exports: request parameter normalisers, WP_Error guard builders, capability enforcement closures, and cache metadata writers. Each helper becomes a private module unless it needs direct consumption elsewhere in `wp-json-ast`. Shared pieces such as docblock factories and metadata annotations settle into `packages/wp-json-ast/src/common/` so Task 2.2 can reuse them.

Unit coverage lands in `packages/wp-json-ast/tests/rest-controller/`. Snapshot fixtures capture the generated AST for a representative resource set, while focused tests assert the behaviour of request plumbing, capability guards, and taxonomy branches. The CLI integration suite should then swap its direct helper usage for the new factories, keeping one thin adapter to translate the IR into the factory configuration.

#### Task 2.1 Execution Plan

Begin by creating the `rest-controller` directory with the module and route builders plus colocated helpers so the extracted logic has a permanent home. Port the CLI helper logic next, rewriting entry points to accept typed configuration objects and emit `PhpProgram` instances that align with the transport layer expectations. Author unit tests that exercise base controller generation, collection and singular routes, taxonomy-specific handlers, and WP_Error fallbacks to lock down behaviour. Update the CLI builders to consume `buildRestControllerModule` once the factories exist, removing the inlined AST assembly in favour of the new API. Finish the cycle by running the existing CLI integration suites to confirm parity and capture any gaps for follow-up tasks.

#### Task 2.1 Follow-up subtasks - streamlining and parity gaps

**Subtask 2.1.a - Streamline import derivation.** Enhance `buildRestControllerClass` and `buildRestRoute` so they derive all required `use` imports from each `RestRouteConfig`, eliminating the `additionalUses` bookkeeping that the CLI currently performs inside `packages/cli/src/next/builders/php/resourceController.ts`. This keeps import wiring colocated with the WordPress semantics that introduce those dependencies.

_Completion:_ ☑ Completed - Rest controller imports now derive from route statements and helper metadata inside `wp-json-ast`.

**Subtask 2.1.b - Internalise identity plumbing.** Extend the route configuration so the factory can infer whether identity parameters require scalar casts and emit the `$identity = (int) $request->get_param( ... );` assignment directly. Relocating this logic from the CLI adapter consolidates request handling inside `buildRestRoute` and prepares the surface for future module-wide builders.

_Completion:_ ☑ Completed - `buildRestRoute` now emits identity request plumbing based on the route configuration, removing the CLI-only implementation.

**Subtask 2.1.c - Surface metadata host updates.** Design a helper under `rest-controller` (or expand the existing types) that captures cache-segment metadata and docblock annotations alongside the generated statements. Port the CLI’s current `$metadataHost` mutations into this helper so future factories can assemble controller modules without duplicating metadata bookkeeping.

_Completion:_ ☑ Completed - Centralised REST route cache metadata helpers in `wp-json-ast` so controller factories own metadata host updates.

_Quality follow-up:_ ☑ Covered identity plumbing, docblock generation, and cache metadata helpers with focused tests to lock down Task 2.1 behaviour.

_Task 2.2: Layer guard and docblock utilities._ As factories move, ensure docblock generation, metadata wiring, and WP_Error guard helpers live alongside them in `wp-json-ast`. Update the CLI to consume these utilities so that repeated patterns disappear from the CLI codebase.

#### Task 2.2 Follow-up subtasks - shared utility surface

**Subtask 2.2.a - Centralise WP_Error guard utilities.** Relocate the guard builders that wrap `WP_Error` detection and early returns from the CLI into a dedicated `wp-json-ast` module. Provide a cohesive API under `src/common/guards/` and replace CLI imports so guard behaviour comes from the shared surface.

_Completion:_ ☑ Completed - moved the WP_Error guard helpers into `src/common/guards/` and updated imports across `wp-json-ast` and the CLI adapter layer.

**Subtask 2.2.b - Create shared docblock factories.** Extract the controller, capability, and registry docblock assembly logic into reusable builders within `src/common/docblock/`. Cover the factories with unit tests and refactor the CLI helpers to call the shared functions.

_Completion:_ ☑ Completed - exposed docblock factories from `src/common/docblock/` and updated CLI builders to consume them.

**Subtask 2.2.c - Consolidate metadata host wiring.** Implement metadata helper modules under `src/common/metadata/` so cache segments, identity wiring, and annotations originate in `wp-json-ast`. Update CLI builders to use these helpers instead of manipulating `$metadataHost` directly.

_Completion:_ ☑ Completed - consolidated resource metadata builders and cache-key planning in `src/common/metadata/`, allowing the CLI to rely on shared helpers for route annotations and cache events.

_Phase outcome:_ WordPress-specific AST knowledge resides in `wp-json-ast`, and the CLI depends on typed factories rather than constructing nodes manually.

_Task 2.3: Port the capability module surface._ Relocate the CLI's capability builder into `packages/wp-json-ast/src/capability/`, exposing factories that accept the existing capability IR (capability map, fallback details, and transport bindings) and emit complete `PhpProgram` payloads for the registrar and permission callbacks. The CLI should limit itself to translating IR into the factory configuration and relaying reporter warnings.

#### Task 2.3 Blueprint - Capability module

The capability factories should cover every PHP artifact the CLI currently assembles: the `Capability\Capability` registrar, REST callback closures, capability guards, and `WP_Error` fallbacks. The top-level export (`buildCapabilityModule`) returns the registrar program plus auxiliary programs for each generated callback so the pipeline can publish them independently. Configuration matches the CLI IR (`capabilityMap`, plugin namespace, filesystem target paths) and delegates docblocks, metadata wiring, and guard behaviour to the shared utilities introduced in Task 2.2.

Route-level capability enforcement needs a reusable primitive (`buildCapabilityCallback`) that composes docblocks, request parameter extraction, guard invocation, and `WP_Error` responses. The factory should accept the capability identifier, capability requirements, and fallback metadata so the CLI stops stitching these behaviours together manually.

Unit tests land under `packages/wp-json-ast/tests/capability/`, asserting registrar emission, capability resolution, fallback chaining, and warning propagation. Once green, update `createPhpCapabilityHelper` to instantiate the new factories and delete its AST assembly routines.

#### Task 2.3 Execution Plan

1. Create `src/capability/` with module and callback builders that map directly to the CLI artefacts.
2. Port the registrar and callback generation logic, rewriting it to accept typed configuration objects and emit `PhpProgram` results.
3. Exercise the exported factories with fixtures that mirror the CLI integration scenarios (single capability, multi-capability map, fallback guards) to prove feature parity.
4. Replace the CLI helper implementation with thin adapters that invoke `buildCapabilityModule`, reporting warnings through the existing reporter surface.

#### Task 2.3 Follow-up subtasks - parity and ergonomics

**Subtask 2.3.a - Integrate reporter hooks.** Ensure the capability factories expose structured warnings (e.g. missing fallback, unused capability). Provide a typed callback so the CLI can forward the messages without rehydrating context.

_Completion:_ ☑ Completed - `buildCapabilityModule` now surfaces structured warning hooks consumed by the CLI reporter.

**Subtask 2.3.b - Share callback metadata helpers.** Extract the repeated `$metadataHost` interactions that tag capability callbacks with cache segments or schema provenance. Relocate them into `src/common/metadata/` so all factories reuse a consistent implementation.

_Completion:_ ☑ Completed - centralized capability metadata generation under `src/common/metadata/capability.ts` and wired the CLI to the shared surface.

_Task 2.4: Migrate persistence registry builders._ Shift the persistence registry logic from the CLI into `packages/wp-json-ast/src/persistence/`. The exported factories should transform resource storage definitions into registrar programs, storage adapters, and identity helpers so the CLI simply forwards IR data.

#### Task 2.4 Blueprint - Persistence registry

Define `buildPersistenceRegistryModule` to emit the registrar, resource-specific payload factories, and the identity metadata loader. Accept a configuration object containing the plugin namespace, storage descriptors, identity schemas, and cache configuration already surfaced in the CLI IR. Bundle related helpers (array shape builders, cache segment writers, identity validation) inside the module to remove the remaining AST usage from the CLI.

Where the CLI currently constructs inline arrays and metadata annotations, replace them with shared utilities under `src/common/persistence/`. This keeps request/response semantics centralised and prepares the module for reuse by future transports.

Tests live in `packages/wp-json-ast/tests/persistence/` and should validate registrar wiring, cache key derivation, identity serialisation, and error handling for unsupported storage kinds. Update `createPhpPersistenceRegistryHelper` to delegate to the new module and eliminate its AST assembly code.

#### Task 2.4 Execution Plan

1. Establish the `src/persistence/` directory with registrar and payload builders.
2. Port array construction, metadata annotations, and helper closures from the CLI, rewriting them to consume the new configuration types.
3. Cover the factories with fixtures spanning file storage, option storage, and custom storage extensions, asserting program output snapshots where helpful.
4. Replace the CLI helper implementation with calls to `buildPersistenceRegistryModule`, keeping only the IR-to-config translation layer.

_Completion:_ ☑ Completed - introduced `buildPersistenceRegistryModule` under `src/persistence/`, migrated the CLI helper to delegate to the factory, and added unit tests covering registrar emission and payload sanitisation.

#### Task 2.4 Follow-up subtasks - hardening and reuse

**Subtask 2.4.a - Normalise storage adapters.** Add a shared helper that maps storage kinds (`option`, `transient`, `custom`) to the appropriate AST fragments, replacing the CLI switch statements.

_Completion:_ ☑ Completed - introduced `normalizeStorageConfig` in `src/persistence/helpers.ts` so the module emits sorted storage payloads for post, option, transient, and taxonomy adapters.

**Subtask 2.4.b - Co-locate identity validation.** Move the scalar casting and guard logic for identity payloads into `wp-json-ast`, aligning it with the request plumbing added in Task 2.1.

_Completion:_ ☑ Completed - added `normalizeIdentityConfig` that applies default params, casts, and guards while keeping the CLI adapter free of identity AST handling.

_Task 2.5: Extract index and base controller emitters._ Consolidate the base controller and index file generators under `packages/wp-json-ast/src/module/` so they produce ready-to-write programs from the CLI IR. This removes the last general-purpose PHP emitters from the CLI and ensures future modules inherit consistent docblocks and metadata wiring.

#### Task 2.5 Blueprint - Shared module builders

`buildBaseControllerProgram` should accept the plugin namespace, origin metadata, and docblock inputs, producing the abstract controller class without requiring the CLI to touch `buildClass` or `buildMethod` directly. Likewise, `buildIndexProgram` accepts the list of generated artefacts (controllers, capabilities, persistence registries) and returns a canonical array export that matches the runtime bootstrap expectations.

Support utilities for namespace derivation, docblock attribution, and array literal construction should reside next to these factories so other packages can reuse them. The CLI adapter reduces to composing the list of module entries and passing it into the factory.

Tests belong in `packages/wp-json-ast/tests/module/`, covering namespace rendering, docblock content, and ordering guarantees for the exported registry. Snapshotting the final programs ensures the CLI parity remains intact after the migration.

#### Task 2.5 Execution Plan

1. Add the `src/module/` directory with base controller and index program builders plus supporting helpers.
2. Translate the CLI implementations into factories that accept configuration objects and emit `PhpProgram` payloads.
3. Write unit tests verifying class signatures, docblock contents, and array structure for representative IR inputs.
4. Replace `createPhpBaseControllerHelper` and `createPhpIndexFileHelper` with adapters that call the new factories, deleting direct AST usage from the CLI.

_Completion:_ ☑ Completed - extracted base controller and index program builders into `src/module/` and updated the CLI adapters to consume the shared programs.

#### Task 2.5 Follow-up subtasks - extensibility

**Subtask 2.5.a - Support custom module entries.** Extend `buildIndexProgram` to accept optional augmentation callbacks so downstream pipelines can register additional artefacts without rewriting the factory.

_Completion:_ ☑ Completed - module index builders now accept augmentation callbacks and the plan reflects module composition.

**Subtask 2.5.b - Share namespace derivation.** Lift the namespace sanitisation helpers into `src/common/module/` so every factory consumes a consistent implementation.

_Completion:_ ☑ Completed - namespace derivation helpers now live under src/common/module and the CLI consumes the shared implementation.

_Task 2.6: Consolidate resource request and mutation helpers._ The CLI's `resource` directory still assembles request payloads, cache metadata, mutation contracts, and error envelopes directly with php-json-ast primitives. Relocate this surface into `packages/wp-json-ast/src/resource/` so the factories that power REST controllers can also materialise resource-specific accessors without duplicating AST glue.

#### Task 2.6 Blueprint - Resource accessors

Expose a top-level `buildResourceAccessors` entry point that accepts the IR resource descriptor (schema provenance, cache hints, request parameter layout, mutation contracts) and returns typed helpers the CLI can slot into generated controllers. Submodules under `src/resource/` capture the current CLI helpers:

- `request/` houses parameter extraction builders (`buildRequestShape`, `buildIdentityParams`, `buildPaginationParams`) so REST routes and persistence payloads reuse identical plumbing.
- `query/` and `mutation/` emit closures that call into `@wpkernel/core` transport abstractions, wrapping responses in the WordPress-aware docblocks, metadata annotations, and WP_Error guards migrated in Tasks 2.1 and 2.2.
- `cache/` consolidates cache-key derivation, transient expirations, and invalidation events that the CLI currently crafts inline for each resource.

These factories emit structured artifacts (`{ helper, metadata }`) so downstream modules can compose them without touching raw AST nodes. Shared utilities such as PHP value marshalling, error factories, and schema normalisers relocate into `src/resource/common/` for reuse across persistence and controller modules.

#### Task 2.6 Execution Plan

1. Create `src/resource/` mirroring the CLI directory layout (request, query, mutation, cache, utils) with TypeScript-first configuration objects that align with the IR structures already passed through the builders.
2. Port each helper, rewriting them to emit `PhpProgram` fragments or callable builders that the REST controller factory can inject while relying on shared docblock/metadata helpers.
3. Cover the exported surface with fixtures in `packages/wp-json-ast/tests/resource/`, snapshotting request plumbing and mutation payloads to ensure parity with the CLI implementations.
4. Update the CLI resource controller and persistence registry helpers to consume `buildResourceAccessors`, deleting the inline AST assembly and keeping only the IR-to-config translation.

#### Task 2.6 Subtasks - staged resource extraction

Breaking Task 2.6 into storage-aware subtasks keeps each migration focused and aligns with the Phase 3.2 bundles. The goal is to land shared plumbing inside `@wpkernel/wp-json-ast` first so Phase 3.2 can compose declarative bundles without re-porting helpers.

**Subtask 2.6.a – Scaffold `buildResourceAccessors` registry.** Stand up `src/resource/accessors/` with the top-level `buildResourceAccessors` export and storage-specific registration hooks that surface request/query/mutation/cache descriptors. Add smoke tests in `tests/resource/accessors/` and update the CLI to call the new entry point while still consuming CLI-hosted helpers.

_Completion:_ ☑ Completed – Introduced accessor registry surface with smoke coverage and wired the CLI to consume it.

**Subtask 2.6.b – Port WP_Post query helpers.** Move list, meta query, and taxonomy query helpers from `packages/cli/src/next/builders/php/resource/wpPost/**` into `src/resource/wp-post/query/`, sharing normalisers from `resource/common/` and mirroring existing CLI fixtures.

_Completion:_ ☑ Completed – Migrated WP_Post list/meta/taxonomy query helpers into `@wpkernel/wp-json-ast` with unit coverage and rewired the CLI to consume the shared exports.

**Subtask 2.6.c – Port WP_Post mutation helpers and macros.** Relocate helper methods (`syncWpPostMeta`, taxonomy synchronisers) and macro builders into `src/resource/wp-post/mutation/`, returning typed descriptors that Phase 3.2.b can compose. Cover macro output with focused fixtures.

_Completion:_ ☑ Completed – Introduced `src/resource/wp-post/mutation/` with helper and macro factories, added unit snapshots, and rewired the CLI to consume the shared exports.

**Subtask 2.6.d – Port WP_Post mutation route primitives.** Translate create/update/delete route builders into `src/resource/wp-post/routes/mutation/`, wiring them through the accessor registry so the CLI receives ready-made descriptors instead of raw AST nodes.

_Completion:_ ☑ Completed – Migrated mutation route builders into `@wpkernel/wp-json-ast`, refreshed snapshots, and rewired the CLI to re-export the shared surface.

**Subtask 2.6.e – Port WP_Option helper and route scaffolding.** Establish `src/resource/storage/wp-option/` with helper methods, autoload coercion, and CRUD route statements, exporting descriptors via the accessor registry.

_Completion:_ ☑ Completed – Hoisted option helpers and CRUD route builders into `src/resource/storage/wp-option/**`, added focussed tests, and rewired the CLI accessor registry to consume the shared exports so Phase 3.2 can compose storage bundles without re-importing AST glue.

**Subtask 2.6.f – Port transient helper and route scaffolding.** Create `src/resource/storage/transient/` that encapsulates key resolution, expiration handling, and cache invalidation for transient CRUD routes, plus unit tests for expiration behaviour.

_Completion:_ ☑ Completed – Centralised transient key, helper, and CRUD route builders under `src/resource/storage/transient`
with metadata-aware tests covering expiration coercion and cache invalidation flows.

**Subtask 2.6.g – Port taxonomy helper methods.** Shift taxonomy identity and resolution helpers into `src/resource/wp-taxonomy/helpers/`, ensuring WP_Error flows reuse the shared accessor utilities.

_Completion:_ ☑ Completed – Migrated taxonomy helper methods into `src/resource/wp-taxonomy/helpers/`, added unit tests, and rewired the CLI to consume the shared storage guard and helper exports.

**Subtask 2.6.h – Port taxonomy list/get query primitives.** Move taxonomy list/get query builders into `src/resource/wp-taxonomy/query/`, snapshotting pagination, identity lookup, and error handling, then register them through `buildResourceAccessors`.

_Completion:_ ☑ Completed – Centralised taxonomy list/get query builders under `src/resource/wp-taxonomy/query/`, backed them with unit coverage, and rewired the CLI accessor registry to consume the shared descriptors.

_Follow-up cleanup:_ Normalised the snake-case slug helpers across resource query and storage modules to eliminate duplicate implementations ahead of closing Task 2.6.

_Task 2.7: Move block registrar and render stubs._ Block registration still lives entirely in the CLI (`packages/cli/src/next/builders/php/blocks/**`), including manifest parsing, registrar composition, and server-side render stubs. Port this surface into `packages/wp-json-ast/src/blocks/` so block pipelines consume the same WordPress-aware factories as REST modules.

#### Task 2.7 Blueprint - Block module builders

Introduce `buildBlockModule` that returns the registrar program plus auxiliary render stubs based on the CLI's manifest IR. Supporting factories cover:

- `buildBlockRegistrarProgram` to emit the registrar array and registration calls, using shared docblock factories for attribution.
- `buildRenderStubProgram` to scaffold PHP entry points for dynamic blocks, wiring capability checks and transport callbacks through the guard utilities from Task 2.2.
- `buildManifestMetadata` to translate CLI manifest descriptors into the PHP metadata arrays expected by WordPress.

Keep manifest parsing and schema validation TypeScript-first so the CLI simply forwards the manifest IR. Package unit tests under `packages/wp-json-ast/tests/blocks/` verify registrar output, stub behaviour, and manifest-derived metadata.

#### Task 2.7 Execution Plan

1. Stand up `src/blocks/` with registrar, manifest, and render stub builders that mirror the CLI responsibilities.
2. Port the existing helpers, swapping raw AST assembly for structured factories that emit `PhpProgram` payloads per registrar or stub.
3. Back the new exports with fixtures covering static, dynamic, and capability-gated blocks to guarantee parity with the CLI output.
4. Replace `packages/cli/src/next/builders/php/blocks/**` with adapters that translate manifest IR into the new configuration objects and forward the resulting programs to the pipeline channel.

#### Task 2.7 Follow-up subtasks - extensibility

_Completion:_ ☑ Completed – added `buildBlockModule` emitting manifest, registrar, and render stubs with augmentation hooks; backed by tests.

**Subtask 2.7.a - Support block-level augmentation hooks.** Allow `buildBlockModule` to accept optional callbacks that augment registrar entries or stub programs before emission so future transports can inject analytics or telemetry without rewriting the factory.

_Completion:_ ☑ Completed – hooks for manifest, registrar, and stub augmentation are available and covered by tests.

**Subtask 2.7.b - Share manifest validation errors.** Surface typed error objects from `buildManifestMetadata` so the CLI can report manifest issues without duplicating the validation logic.

_Completion:_ ☑ Completed – `buildManifestMetadata` returns structured validation errors, surfaced via module metadata.

_Task 2.8: Fold identity and pipeline utilities into shared factories._ Helper modules such as `packages/cli/src/next/builders/php/identity.ts`, `utils.ts`, and the php driver wrappers still expose low-level AST node assembly for identity derivation, filesystem targeting, and php-json-ast orchestration. Move these pieces into `wp-json-ast` so the CLI pipeline becomes a thin coordinator over shared primitives.

#### Task 2.8 Blueprint - Identity & pipeline utilities

Create `src/pipeline/` with factories that encapsulate identity resolution and program scheduling:

- `buildIdentityHelpers` reproduces the CLI's scalar casting, UUID handling, and guard closures, returning composable functions for controllers, persistence, and capabilities.
- `buildProgramTargetPlanner` replaces the CLI's writer utilities, determining target paths and filenames from the IR while keeping the php-json-ast driver configuration centralised.
- `buildPhpChannelHelpers` wraps channel reset and buffering logic, eliminating the direct CLI dependence on php-json-ast internals.

These factories expose typed contracts so CLI builders can request identity transforms or target planning without reaching for raw AST helpers.

#### Task 2.8 Execution Plan

1. Carve out `src/pipeline/` with identity, writer, and channel helper modules, importing the metadata/docblock utilities established earlier in Phase 2.
2. Port the CLI helpers into the new modules, rewriting them to emit pure functions and configuration objects rather than hand-built AST nodes.
3. Cover the factories with unit suites under `packages/wp-json-ast/tests/pipeline/`, ensuring identity derivation, channel resets, and writer planning behave identically to the CLI implementations.
4. Update CLI builders (`identity.ts`, `builder.ts`, `writer.ts`, `channelHelper.ts`) to delegate to the shared factories, leaving only pipeline sequencing logic in the CLI.

#### Task 2.8 Follow-up subtasks - robustness

_Completion:_ ☑ Completed – centralised identity guards, channel bootstrap, and program target planning in `src/pipeline`.

**Subtask 2.8.a - Provide filesystem strategy hooks.** Let `buildProgramTargetPlanner` accept callbacks for workspace-specific overrides (e.g., mu-plugins vs. standard plugins) so downstream consumers can adjust output without reimplementing the planner.

_Completion:_ ☑ Completed – `buildProgramTargetPlanner` exposes `strategy.resolveFilePath`; unit tests cover overrides.

**Subtask 2.8.b - Harden identity guard typing.** Export discriminated union types for identity helpers so CLI callers and future transports receive full type inference instead of relying on ad-hoc narrowing.

_Completion:_ ☑ Completed – exported `ResolvedNumberIdentity` / `ResolvedStringIdentity`; tests confirm guard behaviour.

### Phase 3 - Adopt Pipeline-Oriented Composition in the CLI

_Task 3.1: Refine CLI builders into pipelines._ Replace direct orchestration of AST fragments with declarative pipelines (for example `createWpRestControllerHelper` combined with helper components). Each task should focus on one builder, swapping its internal implementation for a pipeline that stitches together the factories established in Phase 2.

_Completion:_ ☐ Pending – controller helper landed, but remaining PHP helpers still need planner alignment, namespace parity, and coverage updates tracked below.

**Subtask 3.1.a – Align base and index helpers with the shared planner.**

- **Context:** `packages/cli/src/next/builders/php/baseController.ts` and `packages/cli/src/next/builders/php/indexFile.ts` still instantiate `createWpPhpFileBuilder` directly and bypass `buildProgramTargetPlanner`.
- **Intent:** Route the base controller and index programs through the planner so file-path derivation, docblock prefixing, and queue diagnostics match the REST controller helper.
- **Expected outcome:** Both helpers enqueue planner actions with the shared docblock prefix, emit consistent reporter messages, and have unit coverage under `packages/cli/src/next/builders/php/__tests__/` asserting the queued descriptors.

_Completion:_ ☑ Completed – Routed the base controller and index helpers through `buildProgramTargetPlanner`, applied the shared docblock prefix, and extended tests to confirm the queued descriptors.

**Subtask 3.1.b – Normalise planner metadata for capability and persistence helpers.**

- **Context:** `packages/cli/src/next/builders/php/capability.ts` and `packages/cli/src/next/builders/php/persistenceRegistry.ts` call `buildProgramTargetPlanner` without supplying the shared docblock prefix, leaving reporter output inconsistent with other helpers.
- **Intent:** Feed the planner the canonical docblock prefix (for example `DEFAULT_DOC_HEADER`) and align queued file diagnostics across helpers.
- **Expected outcome:** Capability and persistence queues capture the prefixed docblocks, emit matching reporter messages, and tests spy on the planner to confirm the normalised metadata payloads.

_Completion:_ ☑ Completed – queued capability and persistence planners with the shared docblock prefix and updated tests to assert the normalised metadata.

**Subtask 3.1.c – Migrate block artefacts onto the planner surface.**

- **Context:** `packages/cli/src/next/builders/php/blocks.ts` writes registrar, manifest, and render stub artefacts manually via workspace transactions instead of the shared planner.
- **Intent:** Convert block module outputs into planner descriptors (including docblock prefixes) and stage non-PHP artefacts through a consistent queue so reporter behaviour matches other helpers.
- **Expected outcome:** Block helpers queue planner actions for each generated file, move manual writes behind a shared pipeline primitive, and ship tests asserting planner usage and stub placement.

_Completion:_ ☑ Completed – staged block manifest, registrar, and render stub artefacts through the shared planner pipeline and updated tests to cover the queued descriptors.

**Subtask 3.1.d – Resolve capability namespace parity between helpers.**

- **Context:** `packages/cli/src/next/builders/php/resourceController.ts` injects `${ir.php.namespace}\Capability\Capability` into the REST plan even though `createPhpCapabilityHelper` emits classes under `${ir.php.namespace}\Generated\Capability`.
- **Intent:** Synchronise namespace derivation so generated controllers import the actual capability class produced by the capability helper.
- **Expected outcome:** REST controllers referencing capabilities import the generated namespace, associated tests cover a capability-protected route, and reporter output confirms the expected permission callback wiring.

_Completion:_ ☑ Completed – REST controllers now import `Generated\\Capability\\Capability`, keeping the CLI and capability module namespaces in sync.

**Subtask 3.1.e – Add coverage for capability-protected routes.**

- **Context:** Current fixtures and tests only validate routes without capability requirements, leaving permission callback plumbing unverified.
- **Intent:** Introduce integration fixtures (for example under `packages/cli/src/next/builders/php/__tests__/fixtures/`) that exercise capability-secured routes and assert generated imports, metadata, and planner queue entries.
- **Expected outcome:** Test suites fail without the namespace fix above, succeed once parity is restored, and future regressions surface through the dedicated capability-route coverage.

_Completion:_ ☑ Completed – added a capability-protected resource fixture and CLI integration test covering imports, metadata, and planner entries.

_Task 3.2: Expand composable helper library._ Build lightweight adapters that compose multiple factories (such as REST controllers plus capability helpers) so the CLI can generate complex files by chaining configuration objects. Document these adapters and ensure integration tests cover the composed output.

Phase 3.1 surfaced that the CLI still performs substantial AST assembly before delegating to `buildRestControllerModuleFromPlan`. `resourceController.ts` and its storage-specific helpers continue to emit `PhpStmt` nodes directly (`buildRouteKindStatements`, `buildTransient*`, `buildWpOption*`, the WP_Post mutation contracts), leaving WordPress semantics spread across CLI-only modules. To finish the reduction, Task 3.2 must pull these hotspots into `@wpkernel/wp-json-ast` so the CLI only prepares declarative plans.

#### Task 3.2 Blueprint - Route and storage adapters migrate into factories

Document the remaining AST-heavy helpers and promote them into first-class factories under `src/rest-controller/` and `src/resource/`. The CLI should supply configuration objects that describe storage modes, mutation contracts, and capability bindings while the factories return statement builders that wire cache metadata, WP_Error envelopes, and helper methods.

##### Remaining CLI AST hotspots and required factories

- `packages/cli/src/next/builders/php/resourceController/routes/handleRouteKind.ts` (route fan-out, TODO stub statements) → `buildResourceControllerRouteSet`, wrapped by `createPhpResourceControllerHelper`.
- `packages/cli/src/next/builders/php/resource/wpOption/**` (routes, helpers, shared metadata) → `buildWpOptionStorageArtifacts`, wrapped by `createPhpWpOptionStorageHelper`.
- `packages/cli/src/next/builders/php/resource/transient/**` (routes, helpers, shared metadata) → `buildTransientStorageArtifacts`, wrapped by `createPhpTransientStorageHelper`.
- `packages/cli/src/next/builders/php/resource/wpTaxonomy/helpers.ts` & `index.ts` → `buildWpTaxonomyHelperArtifacts`, wrapped by `createPhpWpTaxonomyStorageHelper`.
- `packages/cli/src/next/builders/php/resource/wpTaxonomy/list.ts` & `get.ts` → `buildWpTaxonomyQueryRouteBundle`, wrapped by `createPhpWpTaxonomyStorageHelper` and route adapters.
- `packages/cli/src/next/builders/php/resource/wpPost/**` (route fan-out plus mutation macros) → compose existing `@wpkernel/wp-json-ast` wp-post exports (query, mutation, route primitives) directly in the CLI to keep Phase 2.6 parity. A future helper may surface as `createPhpWpPostRoutesHelper` in the CLI (Task 3.3) but there is no `buildWpPostRouteBundle` in `wp-json-ast` today.
- `packages/cli/src/next/builders/php/baseController.ts` & `indexFile.ts` (post-factory module wrapping) → `buildGeneratedModuleProgram`, wrapped by `createPhpBaseControllerHelper` and `createPhpIndexFileHelper`.

> Naming-rule audit: base and index helpers still append statements after calling `build*` exports. Migrating `compileModuleProgram` into `buildGeneratedModuleProgram` keeps the CLI on the `create*` side of the boundary.

**Subtask 3.2.a – Ship `buildResourceControllerRouteSet` for route fan-out.**

- **Context:** `packages/cli/src/next/builders/php/resourceController/routes/handleRouteKind.ts` fans out to storage-specific helpers that return raw `PhpStmt[]`, so `createPhpResourceControllerHelper` still assembles route statements.
- **Intent:** Add `src/rest-controller/routes/buildResourceControllerRouteSet.ts` that accepts the existing `RestControllerRoutePlan` payload and emits route/fallback statements plus TODO stubs.
- **Expected outcome:** The CLI imports `buildResourceControllerRouteSet`, deletes local `PhpStmt` assembly, and unit tests cover route permutations (storage, TODO stubs, capability fallbacks) inside `wp-json-ast`.
- _Completion:_ ☑ Completed – introduced the shared route-set factory, migrated the CLI planner to consume it, and added unit tests covering default, option, and transient flows.

**Subtask 3.2.b – (Deferred) `WP_Post` composite helper.**

- **Context:** `WP_Post` route helpers used to live mostly in the CLI and now rely on the wp-post query/mutation/route primitives exported from `@wpkernel/wp-json-ast` (see Task 2.6.b–d). The CLI currently composes those primitives for wp-post controllers.
- **Intent:** Add either (a) a CLI-side adapter `createPhpWpPostRoutesHelper` that pulls the existing wp-post primitives together or (b) a `wp-json-ast` helper that does the same.
- **Expected outcome:** `createPhpWpPostRoutesHelper` (added in Phase 3.3) receives the bundle, the CLI drops `PhpStmt` imports across WP_Post modules, and tests in `packages/wp-json-ast/tests/resource/wp-post/` exercise each mutation contract.

**Subtask 3.2.c – Publish `buildWpOptionStorageArtifacts`.**

- **Context:** `packages/cli/src/next/builders/php/resource/wpOption/{helpers,routes,shared}.ts` assembles helper methods, cache metadata, and CRUD route statements as raw `PhpStmt[]` before handing them to the resource controller planner.
- **Intent:** Add `src/resource/storage/wpOption/buildWpOptionStorageArtifacts.ts` that accepts the existing option storage IR (primary key, sanitizers, mutation contracts) and returns helper descriptors plus route fragments for create/read/update/delete flows.
- **Expected outcome:** `createPhpWpOptionStorageHelper` becomes a thin adapter over the new factory, tests under `packages/wp-json-ast/tests/resource/storage/wpOption/` cover metadata wiring and WP_Error guards, and the CLI stops touching option-specific AST nodes.
- _Completion:_ ☑ Completed – Added the shared `buildWpOptionStorageArtifacts` factory with helper and route handlers, updated CLI helpers to consume it, and extended wp-option storage tests to cover the aggregated surface.

**Subtask 3.2.d – Publish `buildTransientStorageArtifacts`.**

- **Context:** `packages/cli/src/next/builders/php/resource/transient/{helpers,routes,shared}.ts` still crafts transient get/set/delete flows, expiration handling, and cache invalidation statements inline.
- **Intent:** Introduce `src/resource/storage/transient/buildTransientStorageArtifacts.ts` that transforms the transient storage IR (keys, expiration config, cache segments) into helper methods and route statements with shared metadata annotations.
- **Expected outcome:** `createPhpTransientStorageHelper` delegates entirely to the factory, transient-specific metadata lives in `wp-json-ast`, and tests under `packages/wp-json-ast/tests/resource/storage/transient/` assert expiration handling and reporter warnings.
- _Completion:_ ☑ Completed – Added `buildTransientStorageArtifacts`, migrated the CLI controller planner to consume the aggregated transient helpers, and expanded transient storage tests to cover the bundled route handlers.

**Subtask 3.2.e – Extract taxonomy helper factories.**

- **Context:** `packages/cli/src/next/builders/php/resource/wpTaxonomy/{helpers,index}.ts` emits helper methods for term resolution, mutation scaffolding, and shared metadata using raw `PhpStmt` builders.
- **Intent:** Provide `src/resource/wp-taxonomy/buildWpTaxonomyHelperArtifacts.ts` that receives the taxonomy storage IR (term resolver config, mutation callbacks, shared metadata hosts) and returns helper method descriptors plus reusable metadata blocks.
- **Expected outcome:** The CLI imports the new factory when constructing taxonomy routes, unit tests under `packages/wp-json-ast/tests/resource/wp-taxonomy/helpers/` verify term resolution guards and metadata annotations, and helper assembly moves out of the CLI.
- _Completion:_ ☑ Completed – Centralised taxonomy helper artifacts in `wp-json-ast`, returning class methods and helper signatures that the controller planner now records in metadata while the CLI consumes the shared factory.

**Subtask 3.2.f – Bundle taxonomy list/get routes.**

- **Context:** `packages/cli/src/next/builders/php/resource/wpTaxonomy/{list,get}.ts` orchestrates `WP_Term_Query`, pagination plumbing, and single-term lookups with bespoke AST assembly separate from the helper surface above.
- **Intent:** Create `src/resource/wp-taxonomy/buildWpTaxonomyQueryRouteBundle.ts` that composes list and get route statements (including pagination, cache metadata, and WP_Error guards) from the taxonomy IR and the helper artifacts produced in Subtask 3.2.e.
- **Expected outcome:** Taxonomy list/get planners in the CLI fetch the bundle instead of emitting statements directly, tests under `packages/wp-json-ast/tests/resource/wp-taxonomy/query/` cover success and error flows, and taxonomy query AST logic resides entirely in `wp-json-ast`.
- _Completion:_ ☑ Completed – Added `buildWpTaxonomyQueryRouteBundle` to aggregate taxonomy list/get handlers in `wp-json-ast` and updated the CLI route planner to consume the shared bundle with focused tests.

**Subtask 3.2.g – Move module wrapping into `buildGeneratedModuleProgram`.**

- **Context:** `createPhpBaseControllerHelper` and `createPhpIndexFileHelper` call `compileModuleProgram` to prepend strict types, namespaces, and docblocks even after delegating to `build*` factories.
- **Intent:** Export `buildGeneratedModuleProgram` (likely under `src/module/`) that accepts the module metadata and returns the fully wrapped `PhpProgram` so the CLI helpers only enqueue planner descriptors.
- **Expected outcome:** Base and index helpers become pure `create*` adapters, AST mutations live entirely inside `wp-json-ast`, and tests under `packages/wp-json-ast/tests/module/` assert namespace/docblock wrapping.

_Completion:_ ☑ Completed – introduced `buildGeneratedModuleProgram` so module helpers rely on the shared wrapper and removed CLI-owned AST assembly.

### Task 3.3 – Rewire CLI create-helpers to consume the new factories

Once the factories above land, the CLI needs matching `create*` adapters so planners can invoke them through the existing pipeline surface.

**Subtask 3.3.a – Update `createPhpResourceControllerHelper`.**

- **Scope:** Swap inline AST assembly for calls to `createPhpWpPostRoutesHelper`, storage-specific `create*` helpers, and `buildResourceControllerRouteSet`. Ensure planner wiring remains unchanged while the helper becomes declarative.

**Subtask 3.3.b – Introduce `createPhpWpPostRoutesHelper`.**

- **Scope:** Provide a pipeline helper that translates WP_Post IR into the configuration expected by the shared wp-post primitives and returns the composed bundle to the resource controller helper.

**Subtask 3.3.c – Add storage helpers to the pipeline surface.**

- **Scope:** Create `createPhpWpOptionStorageHelper`, `createPhpTransientStorageHelper`, and `createPhpWpTaxonomyStorageHelper` adapters that marshal IR into the corresponding storage factories and return descriptors for `createPhpResourceControllerHelper`.

**Subtask 3.3.d – Trim base and index helpers to planner orchestration.**

- **Scope:** Replace direct `compileModuleProgram` calls with `buildGeneratedModuleProgram`, leaving the helpers responsible solely for enqueueing planner jobs.

_Completion:_ ☐ Pending – mark complete with a PR link once the create-helper layer consumes only `build*` factories and planner descriptors.

_Phase outcome:_ The CLI acts as a pipeline coordinator that feeds data into `wp-json-ast` factories, making future features additive and reducing the maintenance burden of low-level AST manipulation.
