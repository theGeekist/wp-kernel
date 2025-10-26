# Next PHP AST Parity

_See [Docs Index](./index.md) for navigation._

## Overview

The next-generation CLI pipeline (`packages/cli/src/next/**`) now emits every core PHP artefact as a `PhpProgram`, queues those programs on the builder channel, and pretty-prints them through the shared driver (`packages/cli/src/next/builders/php/writer.ts`). Controllers, helpers, and registries all live in TypeScript AST builders; no string-based emission is reintroduced on the `next/*` branch. Tests lean on the shared fixtures in `packages/test-utils/src/next/**`, so parity is verified against canonical AST structures rather than rendered strings. This document is the canonical status tracker for the AST migration-including completed phases and the work that remains.

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

| Cycle | Patch slots            | Purpose                             | Notes                                                              |
| ----- | ---------------------- | ----------------------------------- | ------------------------------------------------------------------ |
| 0.4.x | 0.4.1-0.4.4            | Pipeline hardening (Tasks 1‑4)      | See [Pipeline Integration Tasks](./pipeline-integration-tasks.md). |
| 0.4.x | 0.4.5 - implementation | Phase 1 - wp-option builders        | Implement controllers/helpers (no string printers).                |
| 0.4.x | 0.4.6 - tests          | Phase 1 - wp-option tests           | Snapshot queued `PhpProgram` payloads.                             |
| 0.4.x | 0.4.7 - fixtures/docs  | Phase 1 - wp-option fixtures/docs   | Refresh fixtures + docs to match AST output.                       |
| 0.4.x | 0.4.8 - buffer         | Phase 1 buffer slot                 | Optional regression fix before 0.5.0.                              |
| 0.4.x | 0.4.9 - release prep   | Phase 1 release prep                | Changelog rollup + release PR.                                     |
| 0.5.x | 0.5.1 - implementation | Phase 2 - transient builders        | Port helper implementations (AST-only).                            |
| 0.5.x | 0.5.2 - tests          | Phase 2 - transient tests           | Cover cache events + error paths.                                  |
| 0.5.x | 0.5.3 - fixtures/docs  | Phase 2 - transient fixtures/docs   | Update fixtures + docs.                                            |
| 0.5.x | 0.5.4 - buffer         | Phase 2 buffer slot                 | Optional bugfix before 0.6.0.                                      |
| 0.6.x | 0.6.1 - implementation | Phase 3 - block builders            | Implement next-gen SSR/JS-only builders.                           |
| 0.6.x | 0.6.2 - tests          | Phase 3 - block tests               | Integration coverage for manifests/registrars.                     |
| 0.6.x | 0.6.3 - fixtures/docs  | Phase 3 - block fixtures/docs       | Update docs + fixtures.                                            |
| 0.6.x | 0.6.4 - buffer         | Phase 3 buffer slot                 | Optional polish before 0.7.0.                                      |
| 0.7.x | 0.7.1 - implementation | Phase 4 - string-printer retirement | Remove legacy printers.                                            |
| 0.7.x | 0.7.2 - tests          | Phase 4 - regression tests          | Regenerate goldens via next pipeline.                              |
| 0.7.x | 0.7.3 - docs           | Phase 4 - documentation cleanup     | Update docs + migration guides.                                    |
| 0.7.x | 0.7.4 - buffer         | Phase 4 buffer slot                 | Optional hotfix before 0.8.0.                                      |

- **Rule of thumb:** Implementation → tests → fixtures/docs. Do not skip the validation leg; AST outputs must be asserted before release.
- **Non-negotiables:** Each slot assumes helpers remain AST-first and respect the `create*` prefix constraint. String-based PHP generation stays deleted.
- **Minor releases:** Once every slot in a cycle ships, consolidate the phase to its minor target (0.5.0, 0.6.0, 0.7.0, 0.8.0) using the release workflow in `RELEASING.md`.

### Phase 0 - Core builders migrated ✓

- `createPhpBuilder` orchestrates the AST-first helpers (policy helper, persistence registry, index file, resource controllers) (`packages/cli/src/next/builders/php/builder.ts`, `printers.ts`).
- `createPhpProgramWriterHelper` pretty-prints queued programs and persists both `.php` and `.ast.json` (`packages/cli/src/next/builders/php/writer.ts`, `php/__tests__/writer.test.ts`).
- Identity resolution, routing metadata, and policy guards live entirely in the AST layer (`packages/cli/src/next/builders/php/identity.ts`, `resourceController/metadata.ts`, `routeIdentity.ts`, `routeNaming.ts`, `routes/handleRouteKind.ts`).
- wp-post controllers (list/get/mutations) and shared utilities live under `packages/cli/src/next/builders/php/resource/wpPost/**` with extensive tests (`wpPostMutations.*.test.ts`, `resourceController.test.ts`).
- wp-taxonomy controllers and helpers are implemented as AST builders (`packages/cli/src/next/builders/php/resource/wpTaxonomy/**`, `wpTaxonomy/helpers.test.ts`).
- Shared test fixtures for the next pipeline reside in `packages/test-utils/src/next/**`, ensuring parity checks run against canonical AST output.

### Phase 1 - wp-option storage parity ⏳

> **MVP Plan reference:** Tasks 5-9 (Phase 1 patch band)

- **Deliverables**
    - **Task 5 - Implementation (0.4.5):** ✓ Completed – AST builders for wp-option controllers/helpers now live under `packages/cli/src/next/builders/php/resource/wpOption/**`, replacing the legacy printer while staying fully AST-first.
    - **Task 6 - Tests (0.4.6):** ✓ Completed – Resource controller coverage snapshots queued `PhpProgram` payloads and verifies the writer emits matching PHP/AST pairs for wp-option controllers.
    - **Task 7 - Fixtures & docs (0.4.7):** ✓ Completed – Integration fixtures queue wp-option controllers and documentation now walks the updated flows.
- **Additional slots**
    - **Task 8 - Buffer (0.4.8):** ✓ Completed – No regressions surfaced after review, so the buffer slot closes without a follow-up patch.
    - **Task 9 - Release prep (0.4.9):** ✓ Completed – Changelog rollup and the monorepo version bump are staged for the 0.5.0 release cut.

### Phase 2 - Transient storage parity ⏳

> **MVP Plan reference:** Task 7 (Phase 2 patch band)

- **Deliverables**
    - Port transient controllers and utilities to AST builders (`packages/cli/src/printers/php/transient.ts` is the current implementation).
    - Backfill tests for cache events, request validation, and response handling.
    - Ensure shared helpers (e.g., cache metadata) work across storage modes.

### Phase 3 - Block printers (SSR & JS-only) ⏳

> **MVP Plan reference:** Task 5 (Phase 3 patch band)

- **Deliverables**
    - Replace the existing block pipeline (`packages/cli/src/printers/blocks/**`) with next-gen builders that emit manifests, registrars, JS entry points, and `render.php` templates from structured data.
    - Provide fixtures/tests that cover SSR, JS-only, and hybrid block scenarios.

### Phase 4 - String-printer retirement ⏳

- **Prerequisite:** Phases 1-3 complete.
- **Deliverables**
    - Remove the string-based printers under `packages/cli/src/printers/php/**` and `packages/cli/src/printers/blocks/**`.
    - Update documentation (including this file, `cli-migration-phases.md`, and CHANGELOG entries).
    - Regenerate any golden fixtures exclusively through the next pipeline.

---

## Canonical schema & tooling

- PHP node factories live in `@wpkernel/php-json-ast`; the schema mirrors `nikic/PHP-Parser` and is documented in `packages/cli/docs/php-json-schema.md`.
- `@wpkernel/php-driver` resolves the pretty-print bridge and supports both CommonJS and ESM environments via native module URL detection with integration coverage guarding the ESM fallback (`packages/php-driver/src/prettyPrinter.ts`, `packages/php-driver/src/__tests__/prettyPrinter.integration.test.ts`).
- Tests should compose `PhpProgram` payloads using helpers in `packages/test-utils/src/next/builders/php/resources.test-support.ts`.
- Driver overrides are threaded through `CreatePhpBuilderOptions`/`CreatePhpProgramWriterHelperOptions`, allowing pipelines to set the PHP binary, script path, or `import.meta.url` for the pretty-print bridge when the default resolution is not available, and native module URL detection covers ESM builds that cannot supply `__dirname`.

---

## Risks & mitigations

- **Incomplete node data** - rely on the shared factories and fixtures; `prettyPrint` surfaces missing data as `KernelError('DeveloperError', …)`.
- **String-printer drift** - defer removal of string printers until the AST equivalents ship with coverage.
- **Block migration complexity** - SSR blocks touch PHP, JSON, and JS outputs; plan comprehensive integration tests before decommissioning the string-based pipeline.

---

## Open questions

- Do adapters need AST-level extension points for blocks, or will a higher-level recipe API suffice once the builders land?
- Should we add checksums/metadata to generated artefacts to detect manual edits before we retire the string-based pipeline?

Update this document whenever a phase ships: move the milestone into “Phase 0 - Core builders migrated” (or add a new completed phase section) with concrete references, and adjust the remaining phases accordingly.
