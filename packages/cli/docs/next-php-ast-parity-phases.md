# Next PHP AST Parity Phases

## Overview

The helper-first pipeline in `next/` now captures every PHP artifact as a `PhpProgram` and pushes it through the builder channel. Resource controllers, taxonomy helpers, policy generation, the persistence registry, and the PHP index helper all emit AST nodes directly, matching the behaviour that the legacy printers rendered with strings while keeping the branch string-free.【F:packages/cli/src/next/builders/php/resourceController.ts†L71-L206】【F:packages/cli/src/next/builders/php/policy.ts†L1-L208】【F:packages/cli/src/next/builders/php/indexFile.ts†L1-L74】 Bridging the remaining gaps means porting the business rules that still live under `packages/cli/src/printers/php/**` (options, transients, other legacy-only helpers) so that each helper emits the same AST the legacy layer rendered with strings. Every phase below must continue to respect the hard constraint that **no legacy, string-based PHP file creation re-enters the `next/*` branch**-the AST pipeline is the only permitted surface.

### Target API shape

Once every phase lands, the PHP builder should expose a fully composable helper-first API that looks like the following:

```ts
const context = createKernelPipelineContext();

createPhpBuilder(context, (register) => {
	register(createPhpBuilderDriverHelper());
	register(createPhpAstChannelHelper());
	register(createPhpProgramBuilder());
	register(createResourceControllerHelper());
	register(createTaxonomyControllerHelper());
	register(createOptionControllerHelper());
	register(createTransientControllerHelper());
	register(createPhpProgramWriterHelper());
});

await flushPipeline(context);

const artifacts = getPhpBuilderChannel(context).pending();
```

This flow never touches string emitters; helpers cooperate through shared context to queue `PhpProgram` payloads that the writer helper prints and persists.

## Phase 1 – Identity and route context alignment

Before we reimplement controllers, the AST helpers need the same normalisation steps the legacy printers depend on.

- ⚠️ **Legacy guard:** while porting utilities, do not introduce any string-based PHP renderers, helper fallbacks, or compatibility shims. All work must stay within the AST helpers and channels.
- Port `resolveIdentityConfig` so the helper defaults to numeric IDs and slug fallbacks the same way the string printers do.【F:packages/cli/src/printers/php/identity.ts†L8-L18】
- Rebuild the canonical route classification helpers that distinguish list/get/create/update/remove handlers; the existing logic keys off canonical base paths and identity params and must move into the AST context to keep method selection stable.【F:packages/cli/src/printers/php/wp-post/routes.ts†L9-L138】
- Update the next-builder tests to assert against channel snapshots (via `getPhpBuilderChannel(context).pending()`) once the identity and routing scaffolding is in place; this locks in AST structure before we add richer handlers.【F:packages/cli/src/next/builders/**tests**/phpBuilder.test.ts†L118-L184】

**Expected outcome:** Helper utilities resolve resource identity and route metadata inside the AST context, and the builder tests assert against the queued programs without adding any legacy string emitters.

## Phase 2 – `wp-post` read pipeline and shared query utilities

Rebuilding the post controller starts with the non-mutating flows and the query helpers they depend on.

- ⚠️ **Legacy guard:** do not introduce any string concatenation or revive the legacy `buildWpPostMethods` printer; all route logic must flow through `createPhpFileBuilder` helpers and the shared AST context.【F:packages/cli/src/printers/php/wp-post/handlers.ts†L12-L55】
- Recreate the shared query builders (query arg normalisation, cache key derivation, identity lookup) as AST-focused utilities so list/get routes can reuse them without pulling in the string templates.【F:packages/cli/src/printers/php/wp-post/list.ts†L1-L86】【F:packages/cli/src/printers/php/wp-post/get.ts†L1-L47】 Introduce these helpers under the general-purpose `packages/cli/src/next/builders/php/resource/` namespace-`createQueryArgsAssignment`, `createPaginationNormalisation`, `createPageExpression`, and `createWpQueryExecution`-so future controllers can share pagination maths, request normalisation, and cache metadata wiring without reinventing `wp-post`-specific scaffolding.
- Extract meta and taxonomy query assembly plus list population into reusable helpers under `packages/cli/src/next/builders/php/resource/wpPost/` so the controller bodies consume a single AST implementation instead of repeating inline builders while keeping the pipeline string-free.
- Introduce shared identity validation and error-response helpers so controllers reuse a common AST surface for `WP_Error` branches and identifier guards instead of re-encoding the legacy string templates.
- Implement AST versions of the list and get route handlers (`createListMethod`, `createGetMethod`) that cover pagination, filtering, and cache invalidation exactly as the legacy templates do.【F:packages/cli/src/printers/php/wp-post/list.ts†L11-L86】【F:packages/cli/src/printers/php/wp-post/get.ts†L10-L47】
- Convert the associated tests to exercise the helper pipeline: feed IR into `createResourceControllerHelper`, pull programs from `getPhpBuilderChannel(context).pending()`, and snapshot the AST to prove the read flows are string-free.【F:packages/cli/src/printers/php/**tests**/wp-post/basic-controller.test.ts†L10-L118】
- **Parallel track:** build reusable AST factories for `WP_Query` construction and cache metadata mutation so subsequent phases can focus on behaviour rather than boilerplate.【F:packages/cli/src/printers/php/wp-post/list.ts†L44-L84】

**Expected outcome:** List and get handlers emit complete `PhpProgram` ASTs with shared query utilities, and the channel-based tests confirm parity without any reliance on string printers.

## Phase 3 – `wp-post` mutation pipeline and helper methods

With read flows in place, port the mutating routes and the helper methods they require.

- ⚠️ **Legacy guard:** mutations must be expressed entirely through AST helpers; avoid copying the legacy `createWpPostHandlers` templates or any inline PHP strings.【F:packages/cli/src/printers/php/wp-post/create.ts†L11-L68】【F:packages/cli/src/printers/php/wp-post/update.ts†L11-L85】【F:packages/cli/src/printers/php/wp-post/delete.ts†L10-L59】

Phase 3 now starts from the shared `ResourceMutationContract`, which fixes the mutation kinds, helper factory names, and metadata tags all tracks must respect. The contract sits alongside a placeholder `wpPost/mutations` module so each scope can land independently without fighting over ownership of the new builders.【F:packages/cli/src/next/builders/php/resource/mutationContract.ts†L1-L44】【F:packages/cli/src/next/builders/php/resource/wpPost/mutations/index.ts†L1-L9】

### Scope 1 – Port `wp-post` mutation routes to the AST pipeline

- Extend `handleRouteKind` so it recognises create, update, and delete routes instead of returning `false`, then dispatch to dedicated mutation builders that mirror the legacy control flow.【F:packages/cli/src/next/builders/php/resourceController/routes/handleRouteKind.ts†L1-L62】【F:packages/cli/src/printers/php/wp-post/create.ts†L11-L68】【F:packages/cli/src/printers/php/wp-post/update.ts†L11-L85】【F:packages/cli/src/printers/php/wp-post/delete.ts†L10-L59】
- Implement the mutation AST emitters under `packages/cli/src/next/builders/php/resource/wpPost/mutations/`, covering status validation, cache priming, and taxonomy/meta synchronisation exactly as the string printers do today.【F:packages/cli/src/next/builders/php/resource/wpPost/mutations/index.ts†L1-L9】【F:packages/cli/src/printers/php/wp-post/create.ts†L30-L68】【F:packages/cli/src/printers/php/wp-post/update.ts†L30-L85】【F:packages/cli/src/printers/php/wp-post/delete.ts†L29-L58】
- Recreate helper methods such as `sync${Pascal}Meta`, `sync${Pascal}Taxonomies`, and `prepare${Pascal}Response` as reusable AST factories so the new builders keep parity with array resets, taxonomy loops, and response shaping from the legacy helpers.【F:packages/cli/src/printers/php/wp-post/helpers.ts†L6-L200】
- Capture mutation-specific cache segments and channel metadata when queueing programs so downstream consumers can distinguish write flows during pipeline inspection.【F:packages/cli/src/next/builders/php/resourceController/metadata.ts†L1-L34】【F:packages/cli/src/next/builders/php/**tests**/resourceController.test.ts†L1-L118】
- Rewrite the controller tests to run through `getPhpBuilderChannel(context).pending()` and snapshot the AST for create/update/delete routes, replacing any string assertions with structure-first checks.【F:packages/cli/src/next/builders/php/**tests**/resourceController.test.ts†L1-L118】

**Expected outcome:** Post mutation routes emit complete `PhpProgram` ASTs for create/update/delete, use the agreed helper factories, and surface the scoped metadata so channel assertions can prove parity without any string regressions.【F:packages/cli/src/next/builders/php/resource/mutationContract.ts†L1-L44】【F:packages/cli/src/next/builders/php/resourceController/routes/handleRouteKind.ts†L1-L62】【F:packages/cli/src/next/builders/php/**tests**/resourceController.test.ts†L1-L118】

### Scope 2 – Shared mutation utilities and client transport alignment

- Extract reusable try/catch-style macros and mutation guards under the `wpPost/mutations` scaffold so future storage domains inherit the same control-flow helpers without string fallbacks.【F:packages/cli/src/next/builders/php/resource/wpPost/mutations/index.ts†L1-L9】【F:packages/cli/src/printers/php/wp-post/helpers.ts†L86-L188】
- Backfill unit coverage for the shared helpers and macros to lock down the generated AST independently of the controller suites.【F:packages/cli/src/next/builders/php/resource/wpPost/mutations/index.ts†L1-L9】
- Update the resource client transport to read HTTP verbs from route metadata so create/update/remove calls honour the configured methods discovered in Phase 2.【F:packages/core/src/resource/client.ts†L70-L295】
- Document the shared mutation contract and metadata expectations as part of the Phase 3 summary to keep the helper-first story string-free.【F:packages/cli/src/next/builders/php/resource/mutationContract.ts†L1-L44】

**Expected outcome:** Reusable mutation macros and contract documentation land with full unit coverage, and the client transport respects metadata-driven verbs so helpers stay string-free and aligned across resource domains.【F:packages/cli/src/next/builders/php/resource/mutationContract.ts†L1-L44】【F:packages/core/src/resource/client.ts†L70-L295】

### Scope 3 – Contract wiring and integration validation

- Replace the placeholder exports in `wpPost/mutations` with the concrete builders and macro wiring supplied by Scopes 1 and 2, ensuring every helper honours the `ResourceMutationContract` keys.【F:packages/cli/src/next/builders/php/resource/wpPost/mutations/index.ts†L1-L9】【F:packages/cli/src/next/builders/php/resource/mutationContract.ts†L1-L44】
- Update `handleRouteKind` and the controller metadata helpers so they consume the shared contract rather than ad-hoc strings, keeping cache segments and channel tags aligned with the agreed surface.【F:packages/cli/src/next/builders/php/resourceController/routes/handleRouteKind.ts†L1-L62】【F:packages/cli/src/next/builders/php/resourceController/metadata.ts†L1-L34】
- Extend the controller integration tests to assert the wired builders emit the contract-defined metadata and macro usage, confirming both parallel scopes converge on the same AST surface before closing the phase.【F:packages/cli/src/next/builders/php/**tests**/resourceController.test.ts†L1-L118】

**Expected outcome:** The mutation builders and macros ship behind the shared contract, the controller metadata honours the agreed cache and channel tags, and the integration tests verify the combined surface so Phase 3 can conclude without ambiguity.【F:packages/cli/src/next/builders/php/resource/mutationContract.ts†L1-L44】【F:packages/cli/src/next/builders/php/**tests**/resourceController.test.ts†L1-L118】

## Phase 4 – `wp-taxonomy` read pipeline and pagination helpers

Taxonomy controllers require list/get flows with pagination, query merging, and term shaping.

- ⚠️ **Legacy guard:** keep pagination, capability checks, and term preparation within AST helpers; no string fallbacks or legacy template reuse is permitted.【F:packages/cli/src/printers/php/wp-taxonomy/methods/list.ts†L4-L73】【F:packages/cli/src/printers/php/wp-taxonomy/methods/get.ts†L4-L88】
- Port the taxonomy list/get handlers to AST, including pagination bounds, parameter filtering, and term response shaping mirroring the string templates.【F:packages/cli/src/printers/php/wp-taxonomy/methods/list.ts†L4-L73】【F:packages/cli/src/printers/php/wp-taxonomy/methods/get.ts†L4-L88】
- Recreate shared helpers such as `prepare${Pascal}TermResponse` and capability guards as AST utilities so they can be shared with the mutation routes.【F:packages/cli/src/printers/php/wp-taxonomy/helpers.ts†L6-L188】
- Shift taxonomy read tests to the helper pipeline, snapshotting the queued AST programs to confirm pagination math and response shaping remain intact.【F:packages/cli/src/next/builders/php/**tests**/resourceController.test.ts†L1-L220】
- **Parallel track:** captured reusable AST helper responsibilities and extension points in this phase summary so subsequent storage modes can mirror the pagination maths, request filtering, and term shaping patterns without revisiting string printers.【F:packages/cli/src/next/builders/php/resource/wpTaxonomy/helpers.ts†L1-L260】【F:packages/cli/docs/next-php-ast-parity-phases.md†L96-L118】
- Added `wpTaxonomy` builders under `packages/cli/src/next/builders/php/resource/` to normalise pagination, merge request parameters, resolve term identities, and shape term responses via AST nodes, removing the legacy string templates for taxonomy controllers.【F:packages/cli/src/next/builders/php/resource/wpTaxonomy/list.ts†L1-L257】【F:packages/cli/src/next/builders/php/resource/wpTaxonomy/get.ts†L1-L133】【F:packages/cli/src/next/builders/php/resource/wpTaxonomy/helpers.ts†L1-L260】
- Registered the taxonomy helpers in the resource controller so taxonomy routes emit cache metadata, include the necessary `WP_Term`/`WP_Term_Query` imports, and append the private helper methods alongside the queued list/get route bodies.【F:packages/cli/src/next/builders/php/resourceController/routes/list.ts†L1-L201】【F:packages/cli/src/next/builders/php/resourceController/routes/get.ts†L1-L122】【F:packages/cli/src/next/builders/php/resourceController.ts†L71-L206】

**Expected outcome:** Taxonomy list/get handlers emit accurate AST, supported by helper-based pagination utilities and channel assertions, with no string-based generation anywhere in `next/*`.

## Phase 5 – `wp-taxonomy` mutation pipeline and shared term helpers

After the read routes, complete taxonomy parity by porting mutations and their supporting utilities.

- ⚠️ **Legacy guard:** mutations must use AST nodes for validation, insertion, and deletion; string concatenation remains prohibited throughout the branch.【F:packages/cli/src/printers/php/wp-taxonomy/methods/create.ts†L4-L124】【F:packages/cli/src/printers/php/wp-taxonomy/methods/update.ts†L4-L146】【F:packages/cli/src/printers/php/wp-taxonomy/methods/delete.ts†L4-L110】
- Translate create/update/delete term handlers to AST, including capability checks, slug uniqueness, and error propagation mirroring the legacy implementations.【F:packages/cli/src/printers/php/wp-taxonomy/methods/create.ts†L30-L124】【F:packages/cli/src/printers/php/wp-taxonomy/methods/update.ts†L28-L146】【F:packages/cli/src/printers/php/wp-taxonomy/methods/delete.ts†L26-L110】
- Implement AST helpers for taxonomy mutation workflows (e.g., `resolve${Pascal}Term`, term meta syncing) so controllers can reuse them without string templates.【F:packages/cli/src/printers/php/wp-taxonomy/helpers.ts†L86-L188】
- Update mutation-focused tests to consume `getPhpBuilderChannel(context).pending()` and assert that the queued AST matches expectations for error branches and success responses.【F:packages/cli/src/printers/php/**tests**/wp-taxonomy-controller.test.ts†L6-L95】
- **Parallel track:** coordinate with Phase 6 contributors to share error-handling AST macros and response helpers across storage domains.【F:packages/cli/src/printers/php/wp-taxonomy/helpers.ts†L86-L188】

**Expected outcome:** Taxonomy mutation routes and helpers generate complete AST programs with behaviour identical to the string printers, validated through channel-based assertions and firmly free of legacy string builders.

## Phase 6 – Option and transient storage helpers

Resources backed by options and transients still rely on the legacy printer to generate getters, setters, and helper utilities.

- ⚠️ **Legacy guard:** option and transient helpers must emit AST for every storage interaction; introducing string fallbacks or legacy helper invocations is prohibited.【F:packages/cli/src/printers/php/wp-option.ts†L31-L190】【F:packages/cli/src/printers/php/transient.ts†L28-L184】
- Port `createWpOptionHandlers` so option-backed routes expose the same get/update/unsupported flow, including autoload normalisation and error codes, as AST builders.【F:packages/cli/src/printers/php/wp-option.ts†L31-L190】
- Port `createTransientHandlers` with its transient key derivation, expiration handling, and error fallbacks, producing AST nodes for every branch.【F:packages/cli/src/printers/php/transient.ts†L28-L184】
- Update the associated tests to execute through the helper pipeline and assert the AST captures `get_option`, `set_transient`, and related calls just as the legacy string snapshots do.【F:packages/cli/src/printers/php/**tests**/wp-option-controller.test.ts†L6-L74】【F:packages/cli/src/printers/php/**tests**/transient-controller.test.ts†L6-L70】
- **Parallel track:** extract reusable AST helpers for error code construction and autoload/expiration normalisation so other storage types can adopt them without duplicating strings.【F:packages/cli/src/printers/php/wp-option.ts†L45-L170】【F:packages/cli/src/printers/php/transient.ts†L42-L162】

**Expected outcome:** Option and transient controllers are emitted exclusively via AST helpers with full behavioural parity, verified through channel assertions and without any string-based builders.

## Phase 7 – Decommission the legacy printers

Once every domain helper emits AST with parity, the legacy string builders can finally disappear.

- ⚠️ **Legacy guard:** the decommissioning work must physically remove string printer modules and prevent them from being re-imported anywhere under `next/*`.【F:packages/cli/src/printers/php/wp-post/handlers.ts†L12-L55】
- Remove the remaining exports under `packages/cli/src/printers/php/**` and reroute any callers to the helper-first modules, keeping only the pieces still needed for golden comparisons.【F:packages/cli/src/printers/php/wp-post/handlers.ts†L12-L55】
- Delete the string-based fixtures after migrating each suite to `getPhpBuilderChannel(context).pending()` so coverage focuses on AST output instead of rendered PHP.【F:packages/cli/src/printers/php/**tests**/wp-post/basic-controller.test.ts†L10-L118】
- Finish by regenerating the end-to-end fixtures (AST JSON and pretty-printed PHP) through the helper pipeline to prove the parity work is complete.
- **Parallel track:** coordinate with documentation owners to update migration guides and ensure no developer workflow references the removed string printers.【F:packages/cli/docs/next-php-ast-parity-phases.md†L5-L33】

**Expected outcome:** The repository no longer contains string-based PHP printers; all artefacts flow through AST helpers, and the build/test suites rely solely on the helper-first pipeline.

## Phase completion summaries

Document the status of each phase once completed, emphasising that the helper-first AST pipeline remained string-free throughout the work:

- **Phase 1 summary:** Resolved identity defaults and canonical route classification within the helper pipeline, recording route metadata on queued programs and updating tests to inspect queued AST programs while keeping the branch free of any legacy string-based PHP generation.【F:packages/cli/docs/next-php-ast-parity-phases.md†L37-L58】【F:packages/cli/src/next/builders/php/resourceController.ts†L203-L307】
- **Phase 2 summary:** Implemented wp-post list/get handlers in the AST pipeline using the shared resource query helpers for pagination, filter normalisation, identity validation, and cache metadata, keeping the new builders string-free while matching the legacy behaviour.【F:packages/cli/src/next/builders/php/resourceController.ts†L520-L870】【F:packages/cli/src/next/builders/php/resource/query.ts†L1-L214】
- **Phase 3 summary:** Implemented the wp-post mutation macros, helper factories, and create/update/delete route builders in the AST pipeline, wired them behind the shared mutation contract for controller routing and metadata tagging, and expanded the channel-based integration tests plus coverage harness so the combined mutation surface matches the legacy behaviour without reintroducing string-based printers.
- **Phase 4 summary:** Implemented the `wp-taxonomy` list/get pipeline with dedicated AST helpers for pagination normalisation, request filtering, term resolution, and response shaping, registered the helpers on the controller so cache metadata and `WP_Term` imports mirror the legacy behaviour, and migrated the taxonomy controller tests to snapshot the queued AST/docblocks instead of asserting rendered strings.【F:packages/cli/src/next/builders/php/resource/wpTaxonomy/list.ts†L1-L257】【F:packages/cli/src/next/builders/php/resource/wpTaxonomy/helpers.ts†L1-L260】【F:packages/cli/src/next/builders/php/**tests**/resourceController.test.ts†L1-L220】
- **Interim cleanup summary:** Converted the PHP index helper, policy helper, and persistence registry orchestration to build AST nodes directly, validated via builder integration tests, leaving the `next/*` pipeline completely free of legacy string-based PHP generation while the legacy printers remain isolated for comparisons.【F:packages/cli/src/next/builders/php/indexFile.ts†L1-L74】【F:packages/cli/src/next/builders/php/policy.ts†L1-L208】【F:packages/cli/src/next/builders/php/persistenceRegistry.ts†L1-L138】【F:packages/cli/src/next/builders/**tests**/phpBuilder.test.ts†L1-L228】
- **Phase 5 summary:** _Pending_
- **Phase 6 summary:** _Pending_
- **Phase 7 summary:** _Pending_
