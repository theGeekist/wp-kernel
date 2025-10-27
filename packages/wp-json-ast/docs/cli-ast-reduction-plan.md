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

_Completion:_ ☐ Pending - replace this line with the PR link and a one-line summary when the task is complete.

_Task 1.2: Identify shared semantics._ Write short briefs for cross-cutting WordPress concerns-such as WP_Error handling, REST request plumbing, taxonomy utilities, and policy scaffolding-highlighting the AST patterns that repeat. These briefs will guide the shape of future `wp-json-ast` factories.

_Completion:_ ☐ Pending - replace this line with the PR link and a one-line summary when the task is complete.

_Phase outcome:_ We gain a shared vocabulary for the existing surface area and a documented backlog that other agents can pull from without rediscovering the same helpers.

### Phase 2 - Establish WordPress Factories in `wp-json-ast`

_Task 2.1: Introduce focused factory modules._ For one concern at a time (for example REST controllers), move the reusable assembly logic into `packages/wp-json-ast/src/<concern>/` and expose exports that accept configuration objects instead of raw builders. Each task should migrate a coherent helper set plus unit tests, keeping the CLI delegating through the new API.

_Completion:_ ☐ Pending - replace this line with the PR link and a one-line summary when the task is complete.

_Task 2.2: Layer guard and docblock utilities._ As factories move, ensure docblock generation, metadata wiring, and WP_Error guard helpers live alongside them in `wp-json-ast`. Update the CLI to consume these utilities so that repeated patterns disappear from the CLI codebase.

_Completion:_ ☐ Pending - replace this line with the PR link and a one-line summary when the task is complete.

_Phase outcome:_ WordPress-specific AST knowledge resides in `wp-json-ast`, and the CLI depends on typed factories rather than constructing nodes manually.

### Phase 3 - Adopt Pipeline-Oriented Composition in the CLI

_Task 3.1: Refine CLI builders into pipelines._ Replace direct orchestration of AST fragments with declarative pipelines (for example `createWpRestController` combined with helper components). Each task should focus on one builder, swapping its internal implementation for a pipeline that stitches together the factories established in Phase 2.

_Completion:_ ☐ Pending - replace this line with the PR link and a one-line summary when the task is complete.

_Task 3.2: Expand composable helper library._ Build lightweight adapters that compose multiple factories (such as REST controllers plus policy helpers) so the CLI can generate complex files by chaining configuration objects. Document these adapters and ensure integration tests cover the composed output.

_Completion:_ ☐ Pending - replace this line with the PR link and a one-line summary when the task is complete.

_Phase outcome:_ The CLI acts as a pipeline coordinator that feeds data into `wp-json-ast` factories, making future features additive and reducing the maintenance burden of low-level AST manipulation.

## Next Steps

This document is the anchor for the first task (Task 1.1). Future contributors should append their findings, inventories, and decisions here so the roadmap evolves alongside the codebase while keeping the CLI stable throughout the migration.
