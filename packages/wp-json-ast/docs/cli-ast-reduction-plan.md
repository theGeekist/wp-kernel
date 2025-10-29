# CLI AST Reduction Plan for `@wpkernel/wp-json-ast`

## Purpose

We are shifting the CLI away from hand-built PHP nodes so that WordPress-aware logic lives in `@wpkernel/wp-json-ast` while the CLI composes higher-level pipelines. Documenting the path keeps follow-on tasks aligned and ensures every phase leaves the tooling fully usable yet better prepared for the next refinement.

## Current Observations

The CLI entry points coordinate a deep stack of helper modules that all reach directly into `@wpkernel/php-json-ast`, so even WordPress-specific behaviours are assembled with low-level node builders. Helpers such as the base controller blend `createWpPhpFileBuilder` with explicit `buildClass`, `buildMethodCall`, and `buildReturn` calls to emit a single method, and the resource controller helper inlines nearly all REST controller structure, from docblocks to route method wiring. Policy generation mirrors this pattern by crafting docblocks, closures, WP_Error guards, and serialised payloads from scratch. Supporting utilities that represent canonical WordPress semantics (for example WP_Error early returns, REST request parameter extraction, taxonomy helpers) also live in the CLI and stitch together raw AST nodes, duplicating work whenever another package needs the same construct.

## Opportunities

`@wpkernel/wp-json-ast` already extends the generic program and file builders with auto-guard metadata, so it is the natural home for reusable WordPress composition. It centralises docblock policy helpers yet currently exports only a thin layer of WordPress factories, like the term query instantiation helper. By expanding this surface to cover REST controllers, policy helpers, WP_Error flows, and request plumbing, the CLI can delegate to WordPress-aware factories and avoid repeating low-level AST assembly. With those factories in place, CLI helpers become thin adapters that translate intermediate representations into declarative inputs and receive ready-to-use builders or AST fragments in return.

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

#### Task 1.1 Inventory – Pipeline orchestration

| Module                                                | Export(s)                                                                                 | WordPress behaviour                                                                                                                                                      | Inputs consumed                                                                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `packages/cli/src/next/builders/php/builder.ts`       | `createPhpBuilder`, `PhpDriverConfigurationOptions`                                       | Orchestrates the PHP generation pipeline so WordPress-aware helpers (REST controllers, policy, persistence, blocks) run in sequence via the php-json-ast driver channel. | `BuilderApplyOptions` (`input.ir`, `reporter`, `context`), optional php-json-ast driver configuration.        |
| `packages/cli/src/next/builders/php/channel.ts`       | `getPhpBuilderChannel`, `resetPhpBuilderChannel`, `PhpBuilderChannel`, `PhpProgramAction` | Bridges CLI helpers to the php-json-ast program channel that ultimately feeds WordPress PHP programs to the writer.                                                      | Pipeline context managed by `channelHelper` (workspace-scoped channel state).                                 |
| `packages/cli/src/next/builders/php/channelHelper.ts` | `createPhpChannelHelper`                                                                  | Resets both the CLI and php-json-ast channels before generation so each WordPress build has isolated AST buffers.                                                        | `BuilderApplyOptions` (`context` workspace) and implicit php-json-ast channel state.                          |
| `packages/cli/src/next/builders/php/writer.ts`        | `createPhpProgramWriterHelper`, `CreatePhpProgramWriterHelperOptions`                     | Delegates to php-json-ast's program writer so generated WordPress PHP programs flush to disk with the configured driver.                                                 | Driver configuration plus pipeline `input.outputDir` and workspace FS provided through `BuilderApplyOptions`. |

#### Task 1.1 Inventory – Core file generators

| Module                                                      | Export(s)                                                       | WordPress behaviour                                                                                                                                                          | Inputs consumed                                                                                 |
| ----------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `packages/cli/src/next/builders/php/baseController.ts`      | `createPhpBaseControllerHelper`                                 | Emits an abstract `Rest\BaseController` with the canonical `get_namespace()` implementation and generated docblocks tying the file back to the WordPress resource namespace. | `ir.meta.origin`, `ir.meta.sanitizedNamespace`, `ir.php.namespace`, target `outputDir`.         |
| `packages/cli/src/next/builders/php/indexFile.ts`           | `createPhpIndexFileHelper`                                      | Builds `index.php` that returns an array mapping fully-qualified WordPress REST controller, policy, and registry classes to their generated files.                           | `IRv1` (`ir.meta.origin`, `ir.php.namespace`, `ir.php.outputDir`, `ir.resources`).              |
| `packages/cli/src/next/builders/php/persistenceRegistry.ts` | `createPhpPersistenceRegistryHelper`, `buildPersistencePayload` | Generates `Registration\PersistenceRegistry` returning storage and identity metadata for WordPress resources so the runtime can resolve persistence wiring.                  | `IRv1` resources (storage + identity sections), sanitized via CLI utilities.                    |
| `packages/cli/src/next/builders/php/policy.ts`              | `createPhpPolicyHelper`, `reportPolicyWarnings`                 | Produces `Policy\Policy` with capability maps, fallback handling, REST permission callbacks, and `WP_Error` factories. Logs missing policy warnings for WordPress routes.    | `IRv1.policyMap` (definitions, fallback, warnings), `Reporter`, `ir.php.namespace`, file paths. |

#### Task 1.1 Inventory – Resource controllers & shared utilities

| Module                                                                            | Export(s)                                                                                                                              | WordPress behaviour                                                                                                                                                                                         | Inputs consumed                                                                                         |
| --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `packages/cli/src/next/builders/php/resourceController.ts`                        | `createPhpResourceControllerHelper`                                                                                                    | Creates one `Rest\{Resource}Controller` per resource, wiring docblocks, namespace imports (`WP_Error`, `WP_REST_Request`, policies), route metadata, cache hints, and dispatch through route-kind builders. | `IRv1` resources (routes, storage, identity, schema provenance), workspace paths, canonical base paths. |
| `packages/cli/src/next/builders/php/resourceController/stubs.ts`                  | `buildNotImplementedStatements`                                                                                                        | Emits placeholder route implementations returning `WP_Error(501)` with TODO comments for WordPress handlers that lack CLI support.                                                                          | Individual `IRRoute` (HTTP method + path).                                                              |
| `packages/cli/src/next/builders/php/resourceController/routes/handleRouteKind.ts` | `buildRouteKindStatements`                                                                                                             | Routes controller methods to storage-specific implementations (transient, wp-option, wp-post, taxonomy) and mutation helpers, keeping WordPress semantics centralised.                                      | `IRResource`, `IRRoute`, resolved identity, route metadata kind, cache segments, error-code factory.    |
| `packages/cli/src/next/builders/php/resourceController/routes/list.ts`            | `buildListRouteStatements`                                                                                                             | Builds REST list handlers that normalise pagination, assemble `WP_Query` args, attach taxonomy/meta queries, execute cached queries, and return total counts.                                               | `IRResource.storage` (wp-post/wp-taxonomy), Pascal-case name, metadata host, cache segmentation data.   |
| `packages/cli/src/next/builders/php/resourceController/routes/get.ts`             | `buildGetRouteStatements`                                                                                                              | Generates single-resource REST handlers that enforce identity, hydrate WP_Post data, wrap cache reads, and raise WordPress errors when entities are missing.                                                | `IRResource`, resolved identity, Pascal-case name, error-code factory, metadata host + cache segments.  |
| `packages/cli/src/next/builders/php/resource/request.ts`                          | `buildRequestParamAssignmentStatement`                                                                                                 | Standardises access to `$request->get_param()` with optional casting so controllers can consume WordPress REST request parameters safely.                                                                   | Request variable name, parameter key, optional destination and scalar cast kind.                        |
| `packages/cli/src/next/builders/php/resource/errors.ts`                           | `buildWpErrorReturn`, `buildIsWpErrorGuard`, `buildReturnIfWpError`                                                                    | Provides canonical `WP_Error` returns and guards for early exit patterns in REST controllers and helpers.                                                                                                   | Error codes/messages/status plus arbitrary expressions to guard.                                        |
| `packages/cli/src/next/builders/php/resource/utils.ts`                            | Numerous builders (`normaliseVariableReference`, `buildScalarCast`, `buildMethodCallAssignmentStatement`, etc.)                        | Supplies reusable AST builders for WordPress controller patterns (variable normalisation, casting, foreach loops, cache instrumentation) so storage-specific helpers remain declarative.                    | Variable names, scalar kinds, callable/method descriptors, statements to append.                        |
| `packages/cli/src/next/builders/php/resource/phpValue.ts`                         | `variable`, `expression`, `renderPhpValue`                                                                                             | Renders declarative PHP value descriptors (scalars, arrays, expressions) into AST nodes for config payloads returned by WordPress helpers.                                                                  | Value descriptors assembled from IR data or helper outputs.                                             |
| `packages/cli/src/next/builders/php/resource/query.ts`                            | `buildQueryArgsAssignmentStatement`, `buildPaginationNormalisationStatements`, `buildPageExpression`, `buildWpQueryExecutionStatement` | Encapsulates WordPress `WP_Query` assembly, including pagination guards, cache metadata, and query execution for REST list endpoints.                                                                       | Target variable names, pagination options, cache scope/segments, metadata host.                         |

#### Task 1.1 Inventory – WP_Post resources

| Module                                                                          | Export(s)                                                                                                                                           | WordPress behaviour                                                                                                                                                 | Inputs consumed                                                                                 |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `packages/cli/src/next/builders/php/resource/wpPost/identity.ts`                | `buildIdentityValidationStatements`                                                                                                                 | Validates WP_Post identity parameters (ID vs. slug) and produces `WP_Error` responses when lookups fail.                                                            | `IRResource` identity config, Pascal-case name, error-code factory.                             |
| `packages/cli/src/next/builders/php/resource/wpPost/list.ts`                    | `buildListItemsInitialiserStatement`, `buildListForeachStatement`                                                                                   | Prepares `$items` arrays and foreach loops that hydrate REST collection responses from `WP_Post` IDs.                                                               | Pascal-case name for helper method references.                                                  |
| `packages/cli/src/next/builders/php/resource/wpPost/metaQuery.ts`               | `collectMetaQueryEntries`, `buildMetaQueryStatements`                                                                                               | Collects and renders post meta query fragments so list endpoints can filter via `meta_query`.                                                                       | `IRResource.storage.metaQueries`, request variable names.                                       |
| `packages/cli/src/next/builders/php/resource/wpPost/taxonomyQuery.ts`           | `collectTaxonomyQueryEntries`, `buildTaxonomyQueryStatements`                                                                                       | Builds taxonomy-aware query fragments (including relation + terms) for `WP_Query`.                                                                                  | `IRResource.storage.taxonomies`, taxonomy filters from IR.                                      |
| `packages/cli/src/next/builders/php/resource/wpPost/mutations/macros.ts`        | Macro builders (`buildStatusValidationStatements`, `buildSyncMetaStatements`, `buildSyncTaxonomiesStatements`, `buildCachePrimingStatements`, etc.) | Encodes reusable sequences for create/update/delete mutations: status validation, meta/taxonomy sync, cache priming, and response preparation using WordPress APIs. | Mutation configuration (metadata keys, taxonomy map, cache descriptors), target variable names. |
| `packages/cli/src/next/builders/php/resource/wpPost/mutations/helpers.ts`       | `syncWpPostMeta`, `syncWpPostTaxonomies`, `prepareWpPostResponse`                                                                                   | Wraps WordPress functions (`update_post_meta`, `wp_set_object_terms`, `get_post`) to synchronise and hydrate responses while normalising errors.                    | Resource mutation payloads, taxonomy metadata, WP_Post instances, error-code factory.           |
| `packages/cli/src/next/builders/php/resource/wpPost/mutations/routes/create.ts` | `buildCreateRouteStatements`                                                                                                                        | Generates REST create handlers that insert posts, sync metadata/taxonomies, prime caches, and return hydrated responses.                                            | `IRResource`, Pascal-case name, mutation contract metadata keys.                                |
| `packages/cli/src/next/builders/php/resource/wpPost/mutations/routes/update.ts` | `buildUpdateRouteStatements`                                                                                                                        | Builds REST update handlers performing permission identity checks, post updates, metadata/taxonomy sync, and cache refresh.                                         | `IRResource`, Pascal-case name, resolved identity, mutation metadata keys.                      |
| `packages/cli/src/next/builders/php/resource/wpPost/mutations/routes/remove.ts` | `buildDeleteRouteStatements`                                                                                                                        | Creates REST delete handlers that validate identity, call `wp_delete_post`, manage cache invalidation, and format responses or `WP_Error`.                          | `IRResource`, Pascal-case name, resolved identity, mutation metadata keys.                      |

#### Task 1.1 Inventory – WP_Option, transient, and taxonomy resources

| Module                                                              | Export(s)                                                                                                                                                          | WordPress behaviour                                                                                                                                 | Inputs consumed                                                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `packages/cli/src/next/builders/php/resource/wpOption/helpers.ts`   | `buildWpOptionHelperMethods`                                                                                                                                       | Adds private helpers for option name resolution and autoload normalisation when reading/updating WordPress options.                                 | `IRResource` option storage config, Pascal-case name.                                                                |
| `packages/cli/src/next/builders/php/resource/wpOption/routes.ts`    | `buildWpOptionGetRouteStatements`, `buildWpOptionUpdateRouteStatements`, `buildWpOptionUnsupportedRouteStatements`                                                 | Generates REST handlers that proxy to `get_option`/`update_option`, coerce autoload flags, and return `WP_Error` for unsupported verbs.             | `IRResource` option config, Pascal-case name, error-code factory.                                                    |
| `packages/cli/src/next/builders/php/resource/transient/helpers.ts`  | `buildTransientHelperMethods`                                                                                                                                      | Provides transient key and expiration helpers that normalise namespace segments and TTL handling for REST endpoints.                                | `IRResource` transient config, Pascal-case name, optional namespace.                                                 |
| `packages/cli/src/next/builders/php/resource/transient/routes.ts`   | `buildTransientGetRouteStatements`, `buildTransientSetRouteStatements`, `buildTransientDeleteRouteStatements`, `buildTransientUnsupportedRouteStatements`          | Emits REST handlers for transient storage including identity-aware lookup, TTL writes via `set_transient`, and guard rails for unsupported methods. | `IRResource` transient config, `IRRoute`, resolved identity usage, error-code factory, metadata host/cache segments. |
| `packages/cli/src/next/builders/php/resource/wpTaxonomy/helpers.ts` | `buildWpTaxonomyHelperMethods`, `buildTaxonomyAssignmentStatement`, `buildGetTaxonomyCall`, `buildResolveTaxonomyTermCall`, `buildPrepareTaxonomyTermResponseCall` | Supplies taxonomy-specific helpers to resolve terms, normalise responses, validate identities, and surface consistent `WP_Error` codes.             | `IRResource` taxonomy storage config, Pascal-case name, resolved identity, error-code factory.                       |
| `packages/cli/src/next/builders/php/resource/wpTaxonomy/list.ts`    | `buildWpTaxonomyListRouteStatements`                                                                                                                               | Builds list endpoints that enumerate terms with cache metadata, namespace filtering, and prepared response arrays.                                  | `IRResource` taxonomy config, Pascal-case name, metadata host, cache segments.                                       |
| `packages/cli/src/next/builders/php/resource/wpTaxonomy/get.ts`     | `buildWpTaxonomyGetRouteStatements`                                                                                                                                | Generates single-term handlers that resolve taxonomy identity, guard against missing terms, and return prepared responses.                          | `IRResource` taxonomy config, Pascal-case name, resolved identity, metadata host/cache segments.                     |

#### Task 1.1 Inventory – Blocks (SSR)

| Module                                                                    | Export(s)                                                                                                                             | WordPress behaviour                                                                                                                                                       | Inputs consumed                                                                                |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `packages/cli/src/next/builders/php/blocks/manifestHelper.ts`             | `buildBlocksManifestHelper`                                                                                                           | Produces `blocks-manifest.php` that returns sanitised SSR block manifest data for WordPress runtime consumption.                                                          | `IRv1` blocks with render capability, manifest entries derived from processed block manifests. |
| `packages/cli/src/next/builders/php/blocks/registrar/index.ts`            | `buildBlocksRegistrarHelper`                                                                                                          | Queues the registrar generator that writes the PHP registrar class used to register render callbacks for SSR blocks.                                                      | `IRv1` (block definitions, plugin namespace) via CLI helper pipeline.                          |
| `packages/cli/src/next/builders/php/blocks/registrar/methods/register.ts` | `buildRegisterMethod`                                                                                                                 | Creates the static registrar method that loads the manifest, resolves block metadata paths, and calls `register_block_type_from_metadata` with optional render callbacks. | Manifest path constants, plugin root resolution, manifest entry iteration.                     |
| `packages/cli/src/next/builders/php/blocks/registrar/methods/render.ts`   | `buildBuildRenderArgumentsMethod`, `buildRenderTemplateMethod`                                                                        | Emits helper methods to construct render callback arguments and require the generated PHP render templates for SSR blocks.                                                | Plugin root path, manifest configuration, render template paths.                               |
| `packages/cli/src/next/builders/php/blocks/registrar/methods/paths.ts`    | `buildResolveConfigPathMethod`, `buildResolveRenderPathMethod`, `buildResolveDirectoryFallbackMethod`, `buildNormaliseRelativeMethod` | Normalises file system lookups for block metadata/render files within the plugin structure, providing graceful fallbacks.                                                 | Plugin root directory, manifest config array values.                                           |
| `packages/cli/src/next/builders/php/blocks/registrar/common.ts`           | `buildConstFetchExpr`, `buildContinueStatement`, `buildConcat`                                                                        | Shared AST primitives used by registrar methods to compose filesystem checks and loop control in WordPress block registration.                                            | Constant names, iterable variables, expression operands.                                       |

_Completion:_ ☑ Completed – (this PR) Documented every php-json-ast-consuming CLI helper with WordPress semantics and inputs.

_Task 1.2: Identify shared semantics._ Write short briefs for cross-cutting WordPress concerns-such as WP_Error handling, REST request plumbing, taxonomy utilities, and policy scaffolding-highlighting the AST patterns that repeat. These briefs will guide the shape of future `wp-json-ast` factories.

#### Task 1.2 Briefs – Shared WordPress semantics

**WP_Error guard rails.** Controllers and policies layer consistent error handling by composing `buildReturnIfWpError`, `buildIsWpErrorGuard`, and `buildWpErrorReturn`. The CLI always wraps potentially failing calls-such as `Policy::enforce`, transient writes, or taxonomy lookups-in an `is_wp_error` conditional that immediately returns the same expression. When constructing new errors, helpers emit `new WP_Error` nodes with a structured payload array so HTTP status codes survive transport through `@wpkernel/php-json-ast`.

**REST request plumbing.** Route handlers never reach into `$_REQUEST`; they pull inputs from the injected `WP_REST_Request` via `buildRequestParamAssignmentStatement`. That helper emits `$request->get_param()` calls, optional scalar casts, and variable reassignments so downstream logic can rely on typed local variables. Schema-driven defaults flow through `buildRestArgs` and `renderPhpValue`, ensuring every controller shares the same argument arrays when registering routes.

**Policy scaffolding and callbacks.** The policy helper assembles a final `Policy` class by combining static map lookups, closure factories, and enforcement guards. It repeatedly emits `Policy::enforce( $key, $request )` static calls, wraps the result in the WP_Error guard, and delegates callback creation through `buildClosure` and `buildClosureUse`. Future factories should expose these structural pieces-directives, fallback resolution, and request-aware closures-as first-class builders.

**Taxonomy term resolution.** Taxonomy-aware controllers rely on helper methods that stage a taxonomy slug, resolve identities with `get_term`, and normalise `WP_Term` objects into associative arrays. The AST patterns blend variable normalisation, scalar casts, and early WP_Error returns when `get_term` fails or the resolved term lacks expected properties. These same utilities also build `WP_Term_Query` invocations for list endpoints, so a shared factory should emit the query, guard, and response-normalisation blocks together.

**Shared identity & cache metadata.** Regardless of storage mode, controllers derive route-aware cache segments and identity values through helpers that write to `$metadataHost`. They emit docblocks tagged with `@wp-kernel` annotations, add `use` statements for shared services (`Policy`, `WP_Error`, identity types), and seed per-route metadata objects. A reusable factory can ingest the route metadata and generate docblock arrays, cache segment lookups, and metadata mutations without repeating node assembly in each controller.

_Completion:_ ☑ Completed – (this PR) Documented shared WordPress semantics and recurring AST patterns to target with factories.

_Phase outcome:_ We gain a shared vocabulary for the existing surface area and a documented backlog that other agents can pull from without rediscovering the same helpers.

### Phase 2 - Establish WordPress Factories in `wp-json-ast`

_Task 2.1: Introduce focused factory modules._ For one concern at a time (for example REST controllers), move the reusable assembly logic into `packages/wp-json-ast/src/<concern>/` and expose exports that accept configuration objects instead of raw builders. Each task should migrate a coherent helper set plus unit tests, keeping the CLI delegating through the new API.

#### Task 2.1 Blueprint – REST controllers

The first migration wave will extract the REST controller surface from the CLI so that `@wpkernel/wp-json-ast` owns the WordPress semantics. The destination namespace will live under `packages/wp-json-ast/src/rest-controller/` and export two layers.

`buildRestControllerModule` returns a structured module description containing `PhpProgram` payloads for the abstract base controller, each resource controller class, and the registrar index. It accepts a configuration object that mirrors the existing IR envelope: the plugin namespace, the base namespace fragments, and a collection of resource descriptors that already power the CLI builders. The helper will stitch together base imports, docblocks, controller class declarations, and generated route methods.

`buildRestRoute` exposes the reusable AST for individual route methods. It receives a resource slug, policy references, route metadata, and the prepared request schema. The factory will create the method signature, inject the `$request` parameter, and defer to helper callbacks for each route-kind (collection, singular, custom actions). This layer keeps route-specific logic modular while ensuring the docblock annotations and metadata host wiring follow a single implementation.

Supporting utilities that previously lived in the CLI move alongside these exports: request parameter normalisers, WP_Error guard builders, policy enforcement closures, and cache metadata writers. Each helper becomes a private module unless it needs direct consumption elsewhere in `wp-json-ast`. Shared pieces such as docblock factories and metadata annotations settle into `packages/wp-json-ast/src/common/` so Task 2.2 can reuse them.

Unit coverage lands in `packages/wp-json-ast/tests/rest-controller/`. Snapshot fixtures capture the generated AST for a representative resource set, while focused tests assert the behaviour of request plumbing, policy guards, and taxonomy branches. The CLI integration suite should then swap its direct helper usage for the new factories, keeping one thin adapter to translate the IR into the factory configuration.

#### Task 2.1 Execution Plan

Begin by creating the `rest-controller` directory with the module and route builders plus colocated helpers so the extracted logic has a permanent home. Port the CLI helper logic next, rewriting entry points to accept typed configuration objects and emit `PhpProgram` instances that align with the transport layer expectations. Author unit tests that exercise base controller generation, collection and singular routes, taxonomy-specific handlers, and WP_Error fallbacks to lock down behaviour. Update the CLI builders to consume `buildRestControllerModule` once the factories exist, removing the inlined AST assembly in favour of the new API. Finish the cycle by running the existing CLI integration suites to confirm parity and capture any gaps for follow-up tasks.

#### Task 2.1 Follow-up subtasks – streamlining and parity gaps

**Subtask 2.1.a – Streamline import derivation.** Enhance `buildRestControllerClass` and `buildRestRoute` so they derive all required `use` imports from each `RestRouteConfig`, eliminating the `additionalUses` bookkeeping that the CLI currently performs inside `packages/cli/src/next/builders/php/resourceController.ts`. This keeps import wiring colocated with the WordPress semantics that introduce those dependencies.

_Completion:_ ☑ Completed – (this PR) Rest controller imports now derive from route statements and helper metadata inside `wp-json-ast`.

**Subtask 2.1.b – Internalise identity plumbing.** Extend the route configuration so the factory can infer whether identity parameters require scalar casts and emit the `$identity = (int) $request->get_param( ... );` assignment directly. Relocating this logic from the CLI adapter consolidates request handling inside `buildRestRoute` and prepares the surface for future module-wide builders.

_Completion:_ ☑ Completed – (this PR) `buildRestRoute` now emits identity request plumbing based on the route configuration, removing the CLI-only implementation.

**Subtask 2.1.c – Surface metadata host updates.** Design a helper under `rest-controller` (or expand the existing types) that captures cache-segment metadata and docblock annotations alongside the generated statements. Port the CLI’s current `$metadataHost` mutations into this helper so future factories can assemble controller modules without duplicating metadata bookkeeping.

_Completion:_ ☑ Completed – (this PR) Centralised REST route cache metadata helpers in `wp-json-ast` so controller factories own metadata host updates.

_Quality follow-up:_ ☑ Covered identity plumbing, docblock generation, and cache metadata helpers with focused tests to lock down Task 2.1 behaviour.

_Task 2.2: Layer guard and docblock utilities._ As factories move, ensure docblock generation, metadata wiring, and WP_Error guard helpers live alongside them in `wp-json-ast`. Update the CLI to consume these utilities so that repeated patterns disappear from the CLI codebase.

#### Task 2.2 Follow-up subtasks – shared utility surface

**Subtask 2.2.a – Centralise WP_Error guard utilities.** Relocate the guard builders that wrap `WP_Error` detection and early returns from the CLI into a dedicated `wp-json-ast` module. Provide a cohesive API under `src/common/guards/` and replace CLI imports so guard behaviour comes from the shared surface.

_Completion:_ ☑ Completed – (this PR) moved the WP_Error guard helpers into `src/common/guards/` and updated imports across `wp-json-ast` and the CLI adapter layer.

**Subtask 2.2.b – Create shared docblock factories.** Extract the controller, policy, and registry docblock assembly logic into reusable builders within `src/common/docblock/`. Cover the factories with unit tests and refactor the CLI helpers to call the shared functions.

_Completion:_ ☑ Completed – (this PR) exposed docblock factories from `src/common/docblock/` and updated CLI builders to consume them.

**Subtask 2.2.c – Consolidate metadata host wiring.** Implement metadata helper modules under `src/common/metadata/` so cache segments, identity wiring, and annotations originate in `wp-json-ast`. Update CLI builders to use these helpers instead of manipulating `$metadataHost` directly.

_Completion:_ ☑ Completed – (this PR) consolidated resource metadata builders and cache-key planning in `src/common/metadata/`, allowing the CLI to rely on shared helpers for route annotations and cache events.

_Phase outcome:_ WordPress-specific AST knowledge resides in `wp-json-ast`, and the CLI depends on typed factories rather than constructing nodes manually.

_Task 2.3: Port the policy module surface._ Relocate the CLI's policy builder into `packages/wp-json-ast/src/policy/`, exposing factories that accept the existing policy IR (capability map, fallback details, and transport bindings) and emit complete `PhpProgram` payloads for the registrar and permission callbacks. The CLI should limit itself to translating IR into the factory configuration and relaying reporter warnings.

#### Task 2.3 Blueprint – Policy module

The policy factories should cover every PHP artifact the CLI currently assembles: the `Policy\Policy` registrar, REST callback closures, capability guards, and `WP_Error` fallbacks. The top-level export (`buildPolicyModule`) returns the registrar program plus auxiliary programs for each generated callback so the pipeline can publish them independently. Configuration matches the CLI IR (`policyMap`, plugin namespace, filesystem target paths) and delegates docblocks, metadata wiring, and guard behaviour to the shared utilities introduced in Task 2.2.

Route-level policy enforcement needs a reusable primitive (`buildPolicyCallback`) that composes docblocks, request parameter extraction, guard invocation, and `WP_Error` responses. The factory should accept the policy identifier, capability requirements, and fallback metadata so the CLI stops stitching these behaviours together manually.

Unit tests land under `packages/wp-json-ast/tests/policy/`, asserting registrar emission, capability resolution, fallback chaining, and warning propagation. Once green, update `createPhpPolicyHelper` to instantiate the new factories and delete its AST assembly routines.

#### Task 2.3 Execution Plan

1. Create `src/policy/` with module and callback builders that map directly to the CLI artefacts.
2. Port the registrar and callback generation logic, rewriting it to accept typed configuration objects and emit `PhpProgram` results.
3. Exercise the exported factories with fixtures that mirror the CLI integration scenarios (single capability, multi-policy map, fallback guards) to prove feature parity.
4. Replace the CLI helper implementation with thin adapters that invoke `buildPolicyModule`, reporting warnings through the existing reporter surface.

#### Task 2.3 Follow-up subtasks – parity and ergonomics

**Subtask 2.3.a – Integrate reporter hooks.** Ensure the policy factories expose structured warnings (e.g. missing fallback, unused capability). Provide a typed callback so the CLI can forward the messages without rehydrating context.

_Completion:_ ☑ Completed – (this PR) `buildPolicyModule` now surfaces structured warning hooks consumed by the CLI reporter.

**Subtask 2.3.b – Share callback metadata helpers.** Extract the repeated `$metadataHost` interactions that tag policy callbacks with cache segments or schema provenance. Relocate them into `src/common/metadata/` so all factories reuse a consistent implementation.

_Completion:_ ☑ Completed – (this PR) centralized policy metadata generation under `src/common/metadata/policy.ts` and wired the CLI to the shared surface.

_Task 2.4: Migrate persistence registry builders._ Shift the persistence registry logic from the CLI into `packages/wp-json-ast/src/persistence/`. The exported factories should transform resource storage definitions into registrar programs, storage adapters, and identity helpers so the CLI simply forwards IR data.

#### Task 2.4 Blueprint – Persistence registry

Define `buildPersistenceRegistryModule` to emit the registrar, resource-specific payload factories, and the identity metadata loader. Accept a configuration object containing the plugin namespace, storage descriptors, identity schemas, and cache configuration already surfaced in the CLI IR. Bundle related helpers (array shape builders, cache segment writers, identity validation) inside the module to remove the remaining AST usage from the CLI.

Where the CLI currently constructs inline arrays and metadata annotations, replace them with shared utilities under `src/common/persistence/`. This keeps request/response semantics centralised and prepares the module for reuse by future transports.

Tests live in `packages/wp-json-ast/tests/persistence/` and should validate registrar wiring, cache key derivation, identity serialisation, and error handling for unsupported storage kinds. Update `createPhpPersistenceRegistryHelper` to delegate to the new module and eliminate its AST assembly code.

#### Task 2.4 Execution Plan

1. Establish the `src/persistence/` directory with registrar and payload builders.
2. Port array construction, metadata annotations, and helper closures from the CLI, rewriting them to consume the new configuration types.
3. Cover the factories with fixtures spanning file storage, option storage, and custom storage extensions, asserting program output snapshots where helpful.
4. Replace the CLI helper implementation with calls to `buildPersistenceRegistryModule`, keeping only the IR-to-config translation layer.

_Completion:_ ☑ Completed – (this PR) introduced `buildPersistenceRegistryModule` under `src/persistence/`, migrated the CLI helper to delegate to the factory, and added unit tests covering registrar emission and payload sanitisation.

#### Task 2.4 Follow-up subtasks – hardening and reuse

**Subtask 2.4.a – Normalise storage adapters.** Add a shared helper that maps storage kinds (`option`, `transient`, `custom`) to the appropriate AST fragments, replacing the CLI switch statements.

_Completion:_ ☑ Completed – (this PR) introduced `normalizeStorageConfig` in `src/persistence/helpers.ts` so the module emits sorted storage payloads for post, option, transient, and taxonomy adapters.

**Subtask 2.4.b – Co-locate identity validation.** Move the scalar casting and guard logic for identity payloads into `wp-json-ast`, aligning it with the request plumbing added in Task 2.1.

_Completion:_ ☑ Completed – (this PR) added `normalizeIdentityConfig` that applies default params, casts, and guards while keeping the CLI adapter free of identity AST handling.

_Task 2.5: Extract index and base controller emitters._ Consolidate the base controller and index file generators under `packages/wp-json-ast/src/module/` so they produce ready-to-write programs from the CLI IR. This removes the last general-purpose PHP emitters from the CLI and ensures future modules inherit consistent docblocks and metadata wiring.

#### Task 2.5 Blueprint – Shared module builders

`buildBaseControllerProgram` should accept the plugin namespace, origin metadata, and docblock inputs, producing the abstract controller class without requiring the CLI to touch `buildClass` or `buildMethod` directly. Likewise, `buildIndexProgram` accepts the list of generated artefacts (controllers, policies, persistence registries) and returns a canonical array export that matches the runtime bootstrap expectations.

Support utilities for namespace derivation, docblock attribution, and array literal construction should reside next to these factories so other packages can reuse them. The CLI adapter reduces to composing the list of module entries and passing it into the factory.

Tests belong in `packages/wp-json-ast/tests/module/`, covering namespace rendering, docblock content, and ordering guarantees for the exported registry. Snapshotting the final programs ensures the CLI parity remains intact after the migration.

#### Task 2.5 Execution Plan

1. Add the `src/module/` directory with base controller and index program builders plus supporting helpers.
2. Translate the CLI implementations into factories that accept configuration objects and emit `PhpProgram` payloads.
3. Write unit tests verifying class signatures, docblock contents, and array structure for representative IR inputs.
4. Replace `createPhpBaseControllerHelper` and `createPhpIndexFileHelper` with adapters that call the new factories, deleting direct AST usage from the CLI.

#### Task 2.5 Follow-up subtasks – extensibility

**Subtask 2.5.a – Support custom module entries.** Extend `buildIndexProgram` to accept optional augmentation callbacks so downstream pipelines can register additional artefacts without rewriting the factory.

_Completion:_ ☐ Pending – add augmentation support and update documentation for module composition.

**Subtask 2.5.b – Share namespace derivation.** Lift the namespace sanitisation helpers into `src/common/module/` so every factory consumes a consistent implementation.

_Completion:_ ☐ Pending – relocate namespace helpers and prune the CLI-specific variants.

_Task 2.6: Consolidate resource request and mutation helpers._ The CLI's `resource` directory still assembles request payloads, cache metadata, mutation contracts, and error envelopes directly with php-json-ast primitives. Relocate this surface into `packages/wp-json-ast/src/resource/` so the factories that power REST controllers can also materialise resource-specific accessors without duplicating AST glue.

#### Task 2.6 Blueprint – Resource accessors

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

#### Task 2.6 Follow-up subtasks – parity and reuse

**Subtask 2.6.a – Centralise resource error envelopes.** Extract `errors.ts` and related helpers into `src/resource/errors/` so both controllers and persistence payloads rely on the same WP_Error composition primitives.

_Completion:_ ☐ Pending – move error envelope builders into `wp-json-ast` and replace CLI imports.

**Subtask 2.6.b – Share scalar and enum normalisers.** Relocate the `phpValue` and request schema normalisation helpers into `src/resource/common/`, ensuring every factory consumes a single implementation for casting and enum validation.

_Completion:_ ☐ Pending – expose normalisers from the shared module and drop the CLI-specific variants.

**Subtask 2.6.c – Unify cache invalidation wiring.** Provide a `buildCacheInvalidators` helper that returns the `$metadataHost` mutations the CLI currently duplicates across resources and persistence registries.

_Completion:_ ☐ Pending – publish cache invalidator helpers and remove the remaining CLI metadata wiring.

_Task 2.7: Move block registrar and render stubs._ Block registration still lives entirely in the CLI (`packages/cli/src/next/builders/php/blocks/**`), including manifest parsing, registrar composition, and server-side render stubs. Port this surface into `packages/wp-json-ast/src/blocks/` so block pipelines consume the same WordPress-aware factories as REST modules.

#### Task 2.7 Blueprint – Block module builders

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

#### Task 2.7 Follow-up subtasks – extensibility

**Subtask 2.7.a – Support block-level augmentation hooks.** Allow `buildBlockModule` to accept optional callbacks that augment registrar entries or stub programs before emission so future transports can inject analytics or telemetry without rewriting the factory.

_Completion:_ ☐ Pending – add augmentation hooks and document them alongside the factory contracts.

**Subtask 2.7.b – Share manifest validation errors.** Surface typed error objects from `buildManifestMetadata` so the CLI can report manifest issues without duplicating the validation logic.

_Completion:_ ☐ Pending – expose manifest validation results and remove CLI-side error formatting.

_Task 2.8: Fold identity and pipeline utilities into shared factories._ Helper modules such as `packages/cli/src/next/builders/php/identity.ts`, `utils.ts`, and the php driver wrappers still expose low-level AST node assembly for identity derivation, filesystem targeting, and php-json-ast orchestration. Move these pieces into `wp-json-ast` so the CLI pipeline becomes a thin coordinator over shared primitives.

#### Task 2.8 Blueprint – Identity & pipeline utilities

Create `src/pipeline/` with factories that encapsulate identity resolution and program scheduling:

- `buildIdentityHelpers` reproduces the CLI's scalar casting, UUID handling, and guard closures, returning composable functions for controllers, persistence, and policies.
- `buildProgramTargetPlanner` replaces the CLI's writer utilities, determining target paths and filenames from the IR while keeping the php-json-ast driver configuration centralised.
- `buildPhpChannelHelpers` wraps channel reset and buffering logic, eliminating the direct CLI dependence on php-json-ast internals.

These factories expose typed contracts so CLI builders can request identity transforms or target planning without reaching for raw AST helpers.

#### Task 2.8 Execution Plan

1. Carve out `src/pipeline/` with identity, writer, and channel helper modules, importing the metadata/docblock utilities established earlier in Phase 2.
2. Port the CLI helpers into the new modules, rewriting them to emit pure functions and configuration objects rather than hand-built AST nodes.
3. Cover the factories with unit suites under `packages/wp-json-ast/tests/pipeline/`, ensuring identity derivation, channel resets, and writer planning behave identically to the CLI implementations.
4. Update CLI builders (`identity.ts`, `builder.ts`, `writer.ts`, `channelHelper.ts`) to delegate to the shared factories, leaving only pipeline sequencing logic in the CLI.

#### Task 2.8 Follow-up subtasks – robustness

**Subtask 2.8.a – Provide filesystem strategy hooks.** Let `buildProgramTargetPlanner` accept callbacks for workspace-specific overrides (e.g., mu-plugins vs. standard plugins) so downstream consumers can adjust output without reimplementing the planner.

_Completion:_ ☐ Pending – add planner hooks and excise the CLI-specific branching.

**Subtask 2.8.b – Harden identity guard typing.** Export discriminated union types for identity helpers so CLI callers and future transports receive full type inference instead of relying on ad-hoc narrowing.

_Completion:_ ☐ Pending – publish typed identity helpers and migrate CLI callsites to the new contracts.

### Phase 3 - Adopt Pipeline-Oriented Composition in the CLI

_Task 3.1: Refine CLI builders into pipelines._ Replace direct orchestration of AST fragments with declarative pipelines (for example `createWpRestController` combined with helper components). Each task should focus on one builder, swapping its internal implementation for a pipeline that stitches together the factories established in Phase 2.

_Completion:_ ☐ Pending - replace this line with the PR link and a one-line summary when the task is complete.

_Task 3.2: Expand composable helper library._ Build lightweight adapters that compose multiple factories (such as REST controllers plus policy helpers) so the CLI can generate complex files by chaining configuration objects. Document these adapters and ensure integration tests cover the composed output.

_Completion:_ ☐ Pending - replace this line with the PR link and a one-line summary when the task is complete.

_Phase outcome:_ The CLI acts as a pipeline coordinator that feeds data into `wp-json-ast` factories, making future features additive and reducing the maintenance burden of low-level AST manipulation.

## Next Steps

This document is the anchor for the first task (Task 1.1). Future contributors should append their findings, inventories, and decisions here so the roadmap evolves alongside the codebase while keeping the CLI stable throughout the migration.
