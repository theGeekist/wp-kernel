# Next PHP AST Parity

**COMPLETED**
_See [Docs Index](cli-index.md) for navigation._

## Overview

The CLI pipeline (`packages/cli/src/**`) now emits every core PHP artefact as a `PhpProgram`, queues those programs on the builder channel, and pretty-prints them through the shared driver (`packages/cli/src/builders/php/writer.ts`). Controllers, helpers, and registries all live in TypeScript AST builders; no string-based emission is reintroduced. Tests lean on the shared fixtures in `packages/test-utils/src/**`, so parity is verified against canonical AST structures rather than rendered strings. This document is the canonical status tracker for the AST migration-including completed phases and the work that remains.

### Target API shape

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

The goal remains: every storage mode plugs into a helper-first API, the channel holds pure AST programs, and the writer persists both PHP and JSON AST outputs.

---

---

## Phase status

### Version cadence

| Cycle | Patch slots               | Purpose                              | Notes                                                                                                                                                        |
| ----- | ------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0.4.x | 0.4.1-0.4.4               | Pipeline hardening (Tasks 1‑4)       | See [Pipeline Integration Tasks](cli-pipeline-integration.md).                                                                                               |
| 0.4.x | 0.4.5 - implementation    | Phase 1 - wp-option builders         | Implement controllers/helpers (no string printers).                                                                                                          |
| 0.4.x | 0.4.6 - tests             | Phase 1 - wp-option tests            | Snapshot queued `PhpProgram` payloads.                                                                                                                       |
| 0.4.x | 0.4.7 - fixtures/docs     | Phase 1 - wp-option fixtures/docs    | Refresh fixtures + docs to match AST output.                                                                                                                 |
| 0.4.x | 0.4.8 - buffer            | Phase 1 buffer slot                  | Optional regression fix before 0.5.0.                                                                                                                        |
| 0.4.x | 0.4.9 - release prep      | Phase 1 release prep                 | Changelog rollup + release PR.                                                                                                                               |
| 0.5.x | 0.5.1 - implementation    | Phase 2 - transient builders         | Port helper implementations (AST-only).                                                                                                                      |
| 0.5.x | 0.5.2 - tests             | Phase 2 - transient tests            | Cover cache events + error paths.                                                                                                                            |
| 0.5.x | 0.5.3 - fixtures/docs     | Phase 2 - transient fixtures/docs    | Update fixtures + docs.                                                                                                                                      |
| 0.5.x | 0.5.4 - buffer            | Phase 2 buffer slot                  | Optional bugfix before 0.6.0.                                                                                                                                |
| 0.6.x | 0.6.1 - implementation    | Phase 3 - block builders             | Implement SSR/JS-only builders by replacing `packages/cli/src/printers/blocks/ssr.ts` and `packages/cli/src/printers/blocks/js-only.ts`. Complexity: medium. |
| 0.6.x | 0.6.2 - tests             | Phase 3 - block tests                | Integration coverage for manifests/registrars/`render.php` outputs using the AST + `ts-morph` pipeline. Complexity: medium.                                  |
| 0.6.x | 0.6.3 - fixtures/docs     | Phase 3 - block fixtures/docs        | Update docs + fixtures to reference the new builders and retired printers. Complexity: medium.                                                               |
| 0.6.x | 0.6.4 - buffer            | Phase 3 buffer slot                  | Optional polish before 0.7.0 (e.g., manifest ordering or `ts-morph` import fixes). Complexity: medium.                                                       |
| 0.7.x | 0.7.1 - implementation    | Phase 4 - string-printer retirement  | Remove legacy printers.                                                                                                                                      |
| 0.7.x | 0.7.2 - tests             | Phase 4 - regression tests           | Regenerate goldens via next pipeline.                                                                                                                        |
| 0.7.x | 0.7.3 - docs              | Phase 4 - documentation cleanup      | Update docs + migration guides.                                                                                                                              |
| 0.7.x | 0.7.4 - buffer            | Phase 4 buffer slot                  | Optional hotfix before 0.8.0.                                                                                                                                |
| 0.7.x | 0.7.5 - capability parity | Phase 4 - capability helper parity   | Restore capability enforcement, binding resolution, and structured errors before removing the legacy helper.                                                 |
| 0.7.x | 0.7.6 - safety & blocks   | Phase 4 - controller safety & blocks | Reinstate missing-capability warnings and resource-driven block derivation so JS-only scaffolds keep shipping automatically.                                 |

- **Rule of thumb:** Implementation → tests → fixtures/docs. Do not skip the validation leg; AST outputs must be asserted before release.
- **Non-negotiables:** Each slot assumes helpers remain AST-first and respect the `create*` prefix constraint. String-based PHP generation stays deleted.
- **Minor releases:** Once every slot in a cycle ships, consolidate the phase to its minor target (0.5.0, 0.6.0, 0.7.0, 0.8.0) using the release workflow in `RELEASING.md`.

### Phase 0 - Core builders migrated ✓

- `createPhpBuilder` orchestrates the AST-first helpers (capability helper, persistence registry, index file, resource controllers) (`packages/cli/src/builders/php/builder.ts`, `printers.ts`).
- `createPhpProgramWriterHelper` pretty-prints queued programs and persists both `.php` and `.ast.json` (`packages/cli/src/builders/php/writer.ts`, `php/__tests__/writer.test.ts`).
- Identity resolution, routing metadata, and capability guards live entirely in the AST layer (`packages/cli/src/builders/php/identity.ts`, `resourceController/metadata.ts`, `routeIdentity.ts`, `routeNaming.ts`, `routes/handleRouteKind.ts`).
- wp-post controllers (list/get/mutations) and shared utilities live under `packages/cli/src/builders/php/resource/wpPost/**` with extensive tests (`wpPostMutations.*.test.ts`, `resourceController.test.ts`).
- wp-taxonomy controllers and helpers are implemented as AST builders (`packages/cli/src/builders/php/resource/wpTaxonomy/**`, `wpTaxonomy/helpers.test.ts`).
- Shared test fixtures for the next pipeline reside in `packages/test-utils/src/**`, ensuring parity checks run against canonical AST output.

### Phase 1 - wp-option storage parity ⏳

> **MVP Plan reference:** Tasks 5-9 (Phase 1 patch band)

- **Deliverables**
    - **Task 5 - Implementation (0.4.5):** ✓ Completed – AST builders for wp-option controllers/helpers now live under `packages/cli/src/builders/php/resource/wpOption/**`, replacing the legacy printer while staying fully AST-first.
    - **Task 6 - Tests (0.4.6):** ✓ Completed – Resource controller coverage snapshots queued `PhpProgram` payloads and verifies the writer emits matching PHP/AST pairs for wp-option controllers.
    - **Task 7 - Fixtures & docs (0.4.7):** ✓ Completed – Integration fixtures queue wp-option controllers and documentation now walks the updated flows.
- **Additional slots**
    - **Task 8 - Buffer (0.4.8):** ✓ Completed – No regressions surfaced after review, so the buffer slot closes without a follow-up patch.
    - **Task 9 - Release prep (0.4.9):** ✓ Completed – Changelog rollup and the monorepo version bump are staged for the 0.5.0 release cut.

### Phase 2 - Transient storage parity ⏳

> **MVP Plan reference:** Tasks 11-15 (Phase 2 patch band)

#### Task 11 - Transient AST builders (0.5.1)

- Port every transient controller/helper under `packages/cli/src/printers/php/transient.ts` to the AST-first pipeline (`packages/cli/src/builders/php/resource/transient/**`).
- Replace bespoke JSON node literals with canonical `@wpkernel/php-json-ast` factories and ensure each helper queues `PhpProgramAction` entries instead of string payloads.
- Thread transient cache metadata through the shared registries so option/transient storage continues to share cache keys and invalidation helpers.

#### Task 12 - Transient parity tests (0.5.2)

- Extend next pipeline tests to cover cache events, request validation, and error handling unique to transients (`set`, `delete`, TTL enforcement).
- Add writer assertions that snapshot the queued `PhpProgram` output and confirm the pretty-printer persists matching PHP/AST artefacts.
- Update `packages/cli/tests/workspace.test-support.ts` (or the shared transient fixtures) so integration harnesses exercise transient pipelines in addition to options.

#### Task 13 - Transient fixtures & docs (0.5.3)

- Regenerate fixtures and goldens that cover transient controllers, storage bindings, and cache invalidation flows.
- Update documentation (`docs/index.md`, this file, `cli-migration-phases.md`, and transient-focused guides) to point at the new helpers and tests.
- Capture any migration notes required for downstream plugin authors (e.g., storage key naming changes) in `CHANGELOG.md` and relevant READMEs.

#### Task 14 - Phase 2 buffer slot (0.5.4)

- Reserve room for hotfixes uncovered while landing Tasks 11-13 (e.g., AST edge cases, driver configuration gaps).
- Ship any regressions discovered during verification-transient DELETE handlers now remove cache entries instead of returning 501 errors.
- Close the slot unmodified if no additional regressions surface; document the validation path so future phases can reuse the pattern.

#### Task 15 - Phase 2 minor release (0.6.0)

- Once Tasks 11-14 are ✓, cut the 0.6.0 release via `RELEASING.md` (version bump, changelog rollup, unified checks across CLI/Core/PHP driver/UI).
- Announce the transient parity milestone in `CHANGELOG.md` and ensure adapters know where to hook into the new helpers.
- Refresh docs (`mvp-plan.md`, `cli-migration-phases.md`, adapter brief) to mark Phase 2 as complete and open the Phase 3 patch band.

- **Task 11 - Implementation (0.5.1):** ✓ Completed – Transient controllers/helpers now live under `packages/cli/src/builders/php/resource/transient/**`, emitting sanitised keys and TTL normalisers through the AST pipeline.
- **Task 12 - Tests (0.5.2):** ✓ Completed – Builder and controller suites assert transient cache metadata, TTL sanitisation, and WP_Error handling while snapshotting queued `PhpProgram` artefacts.
- **Task 13 - Fixtures & docs (0.5.3):** ✓ Completed – CLI goldens and contributor docs now surface transient helpers, storage bindings, and cache invalidation guidance for plugin authors.
- **Task 14 - Buffer (0.5.4):** ✓ Completed – DELETE routes now call `delete_transient()` and record cache invalidation metadata so callers can invalidate per-entity caches.
- **Task 15 - Release (0.6.0):** ✓ Completed – Version 0.6.0 shipped with unified changelog entries and version bumps across the monorepo.

- **Task 11 - Implementation (0.5.1):** ✓ Completed – Transient controllers/helpers now live under `packages/cli/src/builders/php/resource/transient/**`, emitting sanitised keys and TTL normalisers through the AST pipeline.
- **Task 12 - Tests (0.5.2):** ✓ Completed – Builder and controller suites assert transient cache metadata, TTL sanitisation, and WP_Error handling while snapshotting queued `PhpProgram` artefacts.
- **Task 13 - Fixtures & docs (0.5.3):** ✓ Completed – CLI goldens and contributor docs now surface transient helpers, storage bindings, and cache invalidation guidance for plugin authors.
- **Task 14 - Buffer (0.5.4):** ✓ Completed – DELETE route fixes closed the transient buffer slot ahead of the 0.6.0 release.

### Phase 3 - Block printers (SSR & JS-only) ✓ Completed

> **MVP Plan reference:** Tasks 16-19 (Phase 3 patch band)

<a id="task-16"></a>

#### Task 16 - Block builder implementation (0.6.1)

Status: ✓ Completed – Block manifests, registrar assembly, and render stubs now stage through the next pipeline helpers with shared `ts-morph` primitives.

- Port block generation into the next pipeline by replacing `packages/cli/src/printers/blocks/**` with helpers under `packages/cli/src/builders/blocks/**`.
- Introduce shared `ts-morph` primitives (module/file factories, metadata helpers) that both the block builders and `createTsBuilder` can consume when emitting TypeScript entry points.
- Keep SSR templates on the PHP channel: emit `render.php` via the existing AST helpers while routing JS-only registrars through the new `ts-morph` utilities so both surfaces share naming and import rules.
- Audit the legacy printers (`ssr.ts`, `js-only.ts`, and `shared/template-helpers.ts`) to mirror manifest structure, registrar wiring, warnings, and fallback `render.php` behaviour before rewriting the helpers.
- Complexity: medium-one run touches PHP AST emitters, shared cache metadata, and the TypeScript registration surface.

<a id="task-17"></a>

#### Task 17 - Block parity tests (0.6.2)

Status: ✓ Completed – Unit and integration coverage assert ts-morph registrars, SSR render programs, manifest caching, and cache invalidation warnings across block permutations.

- Extend the block builder unit suite to assert `ts-morph` output, SSR AST programs, and manifest metadata across SSR, JS-only, and hybrid scenarios.
- Add integration coverage to the generate command harness so goldens capture registrar modules, editor scripts, style handles, and rendered PHP templates produced by the new helpers.
- Wire cache and invalidation expectations into the tests where block controllers touch shared resource metadata, mirroring the transient/option precedent.
- Migrate expectations from `packages/cli/src/printers/blocks/__tests__/**` so parity with the legacy manifest and `render.php` flows is asserted through the new helpers.
- Complexity: medium-covers ts-morph emitters, PHP AST snapshots, and reporter warnings in a single run.

<a id="task-18"></a>

#### Task 18 - Block fixtures & documentation (0.6.3)

Status: ✓ Completed – Fixtures and contributor docs describe the AST-first block builders and retired string printers, keeping showcase outputs aligned.

- Refresh CLI fixtures, generated artefacts, and documentation (`docs/index.md`, this file, `cli-migration-phases.md`, adapter guides) to describe the new block pipeline and the shared `ts-morph` primitives.
- Document migration guidance for plugin authors, including how SSR templates coexist with JS-only bundles and where to hook adapter extensions.
- Ensure changelog entries in the workspace reference the new helpers and updated testing story so downstream releases capture the behaviour change.
- Call out the retirement of `packages/cli/src/printers/blocks/**` so readers know where to audit history.
- Complexity: medium-coordinates fixtures, docs, and changelog updates in one pass.

<a id="task-19"></a>

#### Task 19 - Phase 3 buffer slot (0.6.4)

Status: ✓ Completed – Manifest cache invalidation bugfix closed the buffer so template and manifest edits trigger fresh processing ahead of the 0.7.0 release.

- Reserve capacity for polish or regression fixes discovered while landing Tasks 16-18 (for example, `ts-morph` emit ordering or SSR template edge cases).
- Close the slot with a bugfix if required, or document the validation path if no additional work is needed before cutting 0.7.0.
- Complexity: medium-keep a cloud run available for AST/ts-morph parity fixes uncovered during release hardening.

### Phase 4 - String-printer retirement ⏳

- **Prerequisite:** Phases 1-3 complete.
- **Deliverables**
    - Remove the string-based printers under `packages/cli/src/printers/php/**` and `packages/cli/src/printers/blocks/**`.
    - Update documentation (including this file, `cli-migration-phases.md`, and CHANGELOG entries).
    - Regenerate any golden fixtures exclusively through the next pipeline.

<a id="task-24---capability-helper-parity"></a>

#### Task 24 - Capability helper parity (0.7.5)

Status: ✓ Completed – AST helper now mirrors the legacy enforcement flow, emits structured errors, and reports fallback capabilities through the next pipeline reporter.

- Ported capability checks (`current_user_can` wiring), object binding resolution, and closure scaffolds into the AST helper (`packages/cli/src/builders/php/capability.ts`).
- Restored structured `WP_Error` responses for denied capabilities and missing bindings so controller outputs stay aligned with historical behaviour.
- Threaded capability map warnings back to the reporter so unsecured routes falling back to the default capability surface during generation.
- Updated unit and integration coverage to exercise the new helper methods and refresh the generated `Capability.php` snapshot.
- Complexity: high – touched shared helpers, reporter wiring, and integration tests.

<a id="task-25---controller-safety--block-derivation"></a>

#### Task 25 - Controller safety & block derivation (0.7.6)

Status: ✓ Completed – The next controller helper now emits missing-capability warnings and resource-driven block derivation flows through the manifest collector.

- Restored `warnOnMissingCapabilities` semantics via the PHP controller helper so generation logs match the legacy CLI for write routes without capabilities.
- Implemented resource-driven block derivation in the next pipeline, emitting JS-only manifests and staging auto-register stubs when blocks are absent.
- Threaded derived manifests through the shared collector so TypeScript/PHP registrars consume a deterministic block map.
- Added unit and integration coverage to snapshot controller warnings and generated manifests/stubs, guarding the transition away from string printers.
- Complexity: medium-high – coordinated controller metadata, manifest collection, and JS block builders.

---

## Canonical schema & tooling

- PHP node factories live in `@wpkernel/php-json-ast`; the schema mirrors `nikic/PHP-Parser` and is documented in `cli-php-json-schema.md`.
- `@wpkernel/php-driver` resolves the pretty-print bridge and supports both CommonJS and ESM environments via native module URL detection with integration coverage guarding the ESM fallback (`packages/php-driver/src/prettyPrinter.ts`, `packages/php-driver/src/__tests__/prettyPrinter.integration.test.ts`).
- Tests should compose `PhpProgram` payloads using helpers in `packages/test-utils/src/builders/php/resources.test-support.ts`.
- Driver overrides are threaded through `CreatePhpBuilderOptions`/`CreatePhpProgramWriterHelperOptions`, allowing pipelines to set the PHP binary, script path, or `import.meta.url` for the pretty-print bridge when the default resolution is not available, and native module URL detection covers ESM builds that cannot supply `__dirname`.

---

## Risks & mitigations

- **Incomplete node data** - rely on the shared factories and fixtures; `prettyPrint` surfaces missing data as `WPKernelError('DeveloperError', …)`.
- **String-printer drift** - defer removal of string printers until the AST equivalents ship with coverage.
- **Block migration complexity** - SSR blocks touch PHP, JSON, and JS outputs; plan comprehensive integration tests before decommissioning the string-based pipeline.

---

## Open questions

- Do adapters need AST-level extension points for blocks, or will a higher-level recipe API suffice once the builders land?
- Should we add checksums/metadata to generated artefacts to detect manual edits before we retire the string-based pipeline?
- How should the block builders surface recoverable issues (missing render templates, manifest warnings)? Legacy printers emit reporter warnings-confirm whether we keep that contract or introduce typed error codes before swapping pipelines.
- Where do we persist block-specific cache metadata once the manifest/registrar move to AST builders (e.g. per-block hashes, registrar fingerprints) so incremental rebuilds can detect when to skip writes?

Update this document whenever a phase ships: move the milestone into “Phase 0 - Core builders migrated” (or add a new completed phase section) with concrete references, and adjust the remaining phases accordingly.
