# Next PHP AST Parity Phases

## Overview

The helper-first pipeline in `next/` now captures every PHP artifact as a `PhpProgram` and pushes it through the builder channel, but the resource controller helper still generates placeholder handlers that exit early with `WP_Error(501)` and TODO comments instead of the storage-specific logic provided by the legacy printers.【F:packages/cli/src/next/builders/php/printers/resourceController.ts†L203-L307】 Bridging the remaining gaps means porting the business rules that live under `packages/cli/src/printers/php/**` so that each helper emits the same AST the legacy layer rendered with strings.

## Phase 1 – Identity and route context alignment

Before we reimplement controllers, the AST helpers need the same normalisation steps the legacy printers depend on.

- Port `resolveIdentityConfig` so the helper defaults to numeric IDs and slug fallbacks the same way the string printers do.【F:packages/cli/src/printers/php/identity.ts†L8-L18】
- Rebuild the canonical route classification helpers that distinguish list/get/create/update/remove handlers; the existing logic keys off canonical base paths and identity params and must move into the AST context to keep method selection stable.【F:packages/cli/src/printers/php/wp-post/routes.ts†L9-L138】
- Update the next-builder tests to assert against channel snapshots (via `getPhpBuilderChannel(context).pending()`) once the identity and routing scaffolding is in place; this locks in AST structure before we add richer handlers.【F:packages/cli/src/next/builders/**tests**/phpBuilder.test.ts†L118-L184】

## Phase 2 – `wp-post` domain helpers

The WordPress post controller remains the largest gap-today every REST route just returns “Not Implemented.”

- Translate `createWpPostHandlers` and its method builders (`createListMethod`, `createCreateMethod`, etc.) into AST-producing helpers that run inside `createPhpFileBuilder` so each CRUD route emits the same control flow, meta/taxonomy synchronisation, and cache handling as before.【F:packages/cli/src/printers/php/wp-post/handlers.ts†L13-L44】【F:packages/cli/src/printers/php/wp-post/create.ts†L11-L68】
- Carry over the helper methods (status normalisation, identity resolution, taxonomy syncing) so the generated classes match the expectations encoded in the legacy assertions.【F:packages/cli/src/printers/php/**tests**/wp-post/basic-controller.test.ts†L11-L118】
- Replace the string-based tests with AST assertions: feed the same IR into the helper pipeline, collect the pending programs from the channel, and snapshot the resulting nodes so we can diff behaviour safely during follow-up refactors.

## Phase 3 – `wp-taxonomy` domain helpers

Taxonomy controllers handle pagination, query argument merging, and term preparation, none of which exist in the new helper yet.

- Port the taxonomy-specific method builders (list/create/update/delete) so they emit AST blocks that mirror the loop and validation logic from the legacy templates.【F:packages/cli/src/printers/php/wp-taxonomy/methods/list.ts†L4-L72】
- Recreate the shared helpers (`prepare${Pascal}TermResponse`, capability guards, etc.) inside the AST context to maintain parity with the legacy pipelines’ behaviour.
- Migrate the taxonomy test suite to build programs through `createPhpResourceControllerHelper` and assert against the channel output, ensuring pagination math and guard rails survive the conversion.

## Phase 4 – Option and transient storage helpers

Resources backed by options and transients still rely on the legacy printer to generate getters, setters, and helper utilities.

- Port `createWpOptionHandlers` so option-backed routes expose the same get/update/unsupported flow, including autoload normalisation and error codes.【F:packages/cli/src/printers/php/wp-option.ts†L31-L190】
- Port `createTransientHandlers` with its transient key derivation, expiration handling, and error fallbacks.【F:packages/cli/src/printers/php/transient.ts†L28-L204】
- Update the associated tests to execute through the helper pipeline and assert the AST captures `get_option`, `set_transient`, and related calls just as the legacy string snapshots do.【F:packages/cli/src/printers/php/**tests**/wp-option-controller.test.ts†L6-L74】【F:packages/cli/src/printers/php/**tests**/transient-controller.test.ts†L6-L69】

## Phase 5 – Decommission the legacy printers

Once every domain helper emits AST with parity, the legacy string builders can finally disappear.

- Remove the remaining exports under `packages/cli/src/printers/php/**` and reroute any callers to the helper-first modules, keeping only the pieces still needed for golden comparisons.
- Delete the string-based fixtures after migrating each suite to `getPhpBuilderChannel(context).pending()` so coverage focuses on AST output instead of rendered PHP.
- Finish by regenerating the end-to-end fixtures (AST JSON and pretty-printed PHP) through the helper pipeline to prove the parity work is complete.
