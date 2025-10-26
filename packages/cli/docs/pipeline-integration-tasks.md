# Pipeline Integration Tasks

_See [Docs Index](./index.md) for navigation._

> **Non-negotiables:** These tasks live on the next pipeline. Do not introduce or wrap string-based PHP printers, and reserve the `create*` prefix for helpers built with `createHelper`.

### Reserved patches (0.4.x cycle)

| Task                                                  | Reserved version | Status       | Additional checks                                                    |
| ----------------------------------------------------- | ---------------- | ------------ | -------------------------------------------------------------------- |
| Task 1 – Harden Next PHP Writer Helper                | 0.4.1            | ⬜ available | `pnpm --filter @wpkernel/cli test -- --testPathPattern=writer`       |
| Task 2 – Audit PHP Builder Helpers for AST Purity     | 0.4.2            | ⬜ available | `pnpm --filter @wpkernel/cli test -- --testPathPattern=builders/php` |
| Task 3 – End-to-End Generate Pipeline Coverage        | 0.4.3            | ⬜ available | `pnpm --filter @wpkernel/test-utils test`                            |
| Task 4 – Surface Driver Configuration & Documentation | 0.4.4            | ⬜ available | `pnpm --filter @wpkernel/php-driver test`                            |

Update the status column before starting work and link the PR once merged so the release shepherd can validate that every prerequisite shipped before cutting 0.5.0.

---

Task 1 – Harden Next PHP Writer Helper (Complexity: Low–Medium)
`createPhpProgramWriterHelper` already drains the channel, invokes the pretty printer with each queued `PhpProgramAction`, and writes both the PHP source and JSON AST with `ensureDir` semantics before mirroring the writes through `queueWrite` (`packages/cli/src/next/builders/php/writer.ts:10-63`). The remaining risk lives in edge cases: the fallback path when the driver omits an AST payload, the “no work queued” branch, and the debug logging contract all lack coverage. Tightening those seams is a focused change-layer in fixture-driven tests that cover the fallback serialisation and log assertions while keeping the helper’s output queue intact.

**Audit findings**

- When `prettyPrint` omits the AST payload we fall back to the original program (`finalAst = ast ?? action.program`), but there is no test proving the JSON output is built from the fallback. Add a new test case where the mocked driver returns `{ code, ast: undefined }` and assert the `.ast.json` file serialises the queued program.
- We do not assert reporter activity. Add expectations for the “no programs queued” branch and for the per-file debug log to ensure logging stays intact.
- Consider a lightweight test that drains no items and confirms `next?.()` is awaited, so the helper behaves as a pass-through when the channel is empty.

Task 2 – Audit PHP Builder Helpers for AST Purity (Complexity: Medium)
Helpers under `packages/cli/src/next/builders/php/` mostly compose AST nodes via `@wpkernel/php-json-ast`, yet a handful still lean on handwritten objects or string scaffolding. This task walks every helper, replaces ad hoc constructions with canonical factories, and backfills fixtures/tests so schema drift is caught immediately. Expect broad-but-mechanical edits that touch controllers, registries, and shared utilities while keeping the AST-first contract airtight.

**Audit findings**

- Search for direct object literals (`{ kind: 'program', … }`) or `statements` imports that bypass the shared factories; update them to call `@wpkernel/php-json-ast` helpers instead.
- Update unit tests to snapshot canonical factory output. Where fixtures relied on loose shapes, regenerate them using the updated helpers to avoid manual JSON editing.
- Verify no helper reintroduces string-based fallbacks (e.g., `renderPhpFile`). Remove dead imports as you go so static analysis stays clean.

Task 3 – End-to-End Generate Pipeline Coverage (Complexity: Medium–High)
The next pipeline chains the PHP helpers (`packages/cli/src/next/builders/php/builder.ts:20-63`) but today’s test coverage stops at unit-level assertions for individual helpers and the writer. There is no test that runs the full `generate` phase against a mock workspace and verifies the emitted `.php`/`.ast.json` artefacts end-to-end. Standing up that integration test means assembling representative AST payloads, wiring a fake workspace that captures writes, and snapshotting both outputs while proving the legacy string printers never run. The setup and fixture work push the effort into the mid range, yet it is still achievable in a single cloud run.

**Audit findings**

- `packages/cli/src/next/builders/__tests__/phpBuilder.test.ts` queues channel entries but never invokes the writer helper or inspects actual filesystem writes-no `.php`/`.ast.json` assertions.
- Run the pipeline end-to-end (using helpers exported from `packages/test-utils/src/next/runtime/pipeline.fixtures.test-support.ts` or similar) with a representative IR, execute `createPhpBuilder` + `createPhpProgramWriterHelper`, and assert the workspace mock receives matching PHP/AST content.
- Add guards that spy on the legacy printers (`packages/cli/src/printers/php/**`) to ensure they remain untouched during the integration test.

Task 4 – Surface Driver Configuration & Documentation (Complexity: Medium)
Threading configurable PHP driver hooks requires plumbing options through the next builder exports (`packages/cli/src/next/builders/php/index.ts:1-7`) and runtime glue without regressing existing consumers. Once the surface exists, documentation must be refreshed across `packages/cli/docs/cli-migration-phases.md`, `packages/cli/docs/php-ast-migration-tasks.md`, and `packages/cli/CHANGELOG.md` to describe the AST→PHP flow and the new configuration knobs. The code changes are moderate and the documentation pass is deliberate but bounded, keeping the task in the medium band while still suitable for a single cloud run.

**Audit findings**

- `createPhpProgramWriterHelper` calls `buildPhpPrettyPrinter({ workspace })` directly-there is no way to override the PHP binary, script path, or future driver options. Extend `CreatePhpBuilderOptions` so callers (and eventually CLI config) can supply these settings, propagate them through the helper pipeline, and document the new surface.
- Exported convenience helpers in `packages/cli/src/next/builders/php/index.ts` should surface the same options to external consumers.
- Once options exist, add unit tests ensuring overrides reach the driver (mock `buildPhpPrettyPrinter` and assert it was invoked with the supplied paths/bin). Update docs and changelog entries in the same PR so readers understand how to configure the driver.

Task 5 – Add Blocks Builder (Complexity: Medium)
The current block printers in `packages/cli/src/printers/blocks/**` still generate manifests, registrars, and `render.php` stubs as strings. A next-gen `createBlocksBuilder` must implement the same outputs using the AST-first pipeline (no delegation to or wrapping of the string-based printers), run inside the workspace transaction, and queue manifests/registrars/render templates so the block pipeline joins the AST-first workflow. This sets the stage for future config reuse-no new schema fields required because the IR already carries the block metadata.

**Audit findings**

- The string-based SSR code (`packages/cli/src/printers/blocks/ssr.ts`) currently produces:
    - `build/blocks-manifest.php` (assembled via `renderManifestFile`);
    - `php/Blocks/Register.php` registrar class;
    - optional/fallback `render.php` files inside block directories.
- The JS-only pipeline (`packages/cli/src/printers/blocks/js-only.ts`) writes TypeScript registration stubs with `createTsBuilder` and relies on the bundler to produce assets.
- `createIr` already emits `IRBlock` entries with `manifestSource` and `hasRender`; we just need a builder helper that reads those entries, reuses the existing render functions, and stages files through the workspace transaction.
- Tests should migrate from the existing string-based suites (`packages/cli/src/printers/blocks/__tests__/**`) to the next pipeline: use `packages/test-utils/src/next/workspace.test-support.ts` to assert queued writes, cover SSR (manifest/registrar/render stub) and JS-only flows (via `createTsBuilder`), and ensure warnings propagate via the reporter. Do not call the string-based printers from the new tests-assert the AST- and TS-based builders alone generate the files.
