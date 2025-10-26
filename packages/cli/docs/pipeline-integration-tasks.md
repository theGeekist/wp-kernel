# Pipeline Integration Tasks

_See [Docs Index](./index.md) for navigation._

> **Non-negotiables:** These tasks live on the next pipeline. Do not introduce or wrap string-based PHP printers, and reserve the `create*` prefix for helpers built with `createHelper`.

### Reserved patches (0.4.x cycle)

| Task                                                       | Reserved version | Status       | Additional checks                                              |
| ---------------------------------------------------------- | ---------------- | ------------ | -------------------------------------------------------------- |
| Task 1 – Harden Next PHP Writer Helper                     | 0.4.1            | ⬜ available | `pnpm --filter @wpkernel/cli test -- --testPathPattern=writer` |
| Task 2 – Repair Pretty Printer Script Path for ESM Bundles | 0.4.2            | ⬜ available | `pnpm --filter @wpkernel/php-driver test`                      |
| Task 3 – End-to-End Generate Pipeline Coverage             | 0.4.3            | ⬜ available | `pnpm --filter @wpkernel/test-utils test`                      |
| Task 4 – Surface Driver Configuration & Documentation      | 0.4.4            | ⬜ available | `pnpm --filter @wpkernel/php-driver test`                      |

Update the status column before starting work and link the PR once merged so the release shepherd can validate that every prerequisite shipped before cutting 0.5.0.

---

Task 1 – Harden Next PHP Writer Helper (Complexity: Low)
`createPhpProgramWriterHelper` already drains the channel, invokes the pretty printer with each queued `PhpProgramAction`, and writes both the PHP source and JSON AST with `ensureDir` semantics before mirroring the writes through `queueWrite` (`packages/cli/src/next/builders/php/writer.ts:10-63`). The current unit test stubs the pretty printer and verifies the happy path (`packages/cli/src/next/builders/php/__tests__/writer.test.ts:76-134`), but it does not cover the fallback when the driver omits an AST or assert that debug logging stays untouched. Tightening those edge cases is a contained effort-add one more fixture-driven test and light guardrails-so this task remains comfortably within a single cloud run.

**Audit findings**

- When `prettyPrint` omits the AST payload we fall back to the original program (`finalAst = ast ?? action.program`), but there is no test proving the JSON output is built from the fallback. Add a new test case where the mocked driver returns `{ code, ast: undefined }` and assert the `.ast.json` file serialises the queued program.
- We do not assert reporter activity. Add expectations for the “no programs queued” branch and for the per-file debug log to ensure logging stays intact.
- Consider a lightweight test that drains no items and confirms `next?.()` is awaited, so the helper behaves as a pass-through when the channel is empty.

Task 2 – Repair Pretty Printer Script Path for ESM Bundles (Complexity: Low)
Both driver entry points calculate the default bridge script using CommonJS globals; `packages/php-driver/src/prettyPrinter.ts:17-42` hard-codes `__dirname`, while the ESM-friendly helper falls back to `new Function('return import.meta.url;')` (`packages/php-driver/src/prettyPrinter/createPhpPrettyPrinter.ts:55-68`), which always throws because `import.meta` is invalid in that context. When bundled as ESM the resolver therefore lands on `process.cwd()`, so the bridge never starts. Fixing this requires threading `import.meta.url` in environments that support it (e.g., via an optional parameter or conditional dynamic import) and backfilling regression tests that exercise both the CommonJS and ESM paths. The change footprint is narrow-confined to the resolver and its tests-so it fits into one cloud run.

**Audit findings**

- The CommonJS build still relies on `getImportMetaUrl()` with `new Function('return import.meta.url;')`; the guard works only when `__dirname` is available. When the bundle runs as ESM that code throws, so the fallback path `process.cwd()` is still used-bug confirmed.
- Introduce an explicit options field (for example `importMetaUrl?: string`) on `buildPhpPrettyPrinter` so bundlers can pass `import.meta.url` without relying on dynamic evaluation. Provide a tiny helper in the ESM entry point that calls the builder with `new URL('../php/pretty-print.php', import.meta.url)`.
- During tests, exercise both paths: CommonJS (where `__dirname` is defined) and a simulated ESM environment (injecting an `importMetaUrl` option) to prove the script path resolves correctly.

Task 3 – End-to-End Generate Pipeline Coverage (Complexity: Medium)
The next pipeline chains the PHP helpers (`packages/cli/src/next/builders/php/builder.ts:20-63`) but today’s test coverage stops at unit-level assertions for individual helpers and the writer. There is no test that runs the full `generate` phase against a mock workspace and verifies the emitted `.php`/`.ast.json` artefacts end-to-end. Standing up that integration test means assembling representative AST payloads, wiring a fake workspace that captures writes, and snapshotting both outputs. The setup and fixture work push the effort into the mid range, yet it is still achievable in a single cloud run.

**Audit findings**

- `packages/cli/src/next/builders/__tests__/phpBuilder.test.ts` queues channel entries but never invokes the writer helper or inspects actual filesystem writes-no `.php`/`.ast.json` assertions.
- We should run the pipeline end-to-end (using the helpers exported from `packages/test-utils/src/next/runtime/pipeline.fixtures.test-support.ts` or similar) with a representative IR, execute `createPhpBuilder` + `createPhpProgramWriterHelper`, and assert the workspace mock receives the emitted PHP/AST content.
- The integration test should explicitly confirm that the string-based printers under `packages/cli/src/printers/php/**` are not touched and that serialised AST matches the queued program.

Task 4 – Surface Driver Configuration & Documentation (Complexity: Medium)
Exposing configurable PHP driver hooks requires threading options through the next builder exports (`packages/cli/src/next/builders/php/index.ts:1-7`) and runtime glue without regressing existing consumers. Once the surface is in place, documentation needs to be updated across `packages/cli/docs/cli-migration-phases.md`, `packages/cli/docs/php-ast-migration-tasks.md`, and `packages/cli/CHANGELOG.md` to describe the AST→PHP flow and the new configuration knobs. The code changes are moderate and the documentation pass is deliberate but bounded, keeping the task in the medium band while still suitable for a single cloud run.

**Audit findings**

- `createPhpProgramWriterHelper` calls `buildPhpPrettyPrinter({ workspace })` directly-there’s no way to override the PHP binary, script path, or (future) `importMetaUrl`. Extend `CreatePhpBuilderOptions` so callers (and eventually CLI config) can supply these driver options, propagate them through the helper pipeline, and document the new settings.
- Exported convenience helpers in `packages/cli/src/next/builders/php/index.ts` should surface the same options to external consumers.
- Once options exist, add unit tests ensuring overrides reach the driver (mock `buildPhpPrettyPrinter` and assert it was invoked with the supplied paths/bin).

Task 5 – Add Blocks Builder (Complexity: Medium)
The current block printers in `packages/cli/src/printers/blocks/**` still generate manifests, registrars, and `render.php` stubs as strings. A next-gen `createBlocksBuilder` must implement the same outputs using the AST-first pipeline (no delegation to or wrapping of the string-based printers), run inside the workspace transaction, and queue manifests/registrars/render templates so the block pipeline joins the AST-first workflow. This sets the stage for future config reuse (no new schema fields required; IR already captures `IRBlock` metadata).

**Audit findings**

- The string-based SSR code (`packages/cli/src/printers/blocks/ssr.ts`) currently produces:
    - `build/blocks-manifest.php` (assembled via `renderManifestFile`);
    - `php/Blocks/Register.php` registrar class;
    - optional/fallback `render.php` files inside block directories.
- The JS-only pipeline (`packages/cli/src/printers/blocks/js-only.ts`) writes TypeScript registration stubs with `createTsBuilder` and relies on the bundler to produce assets.
- `createIr` already emits `IRBlock` entries with `manifestSource`/`hasRender`; we just need a builder helper that reads those entries, reuses the existing render functions, and stages files through the workspace transaction.
- Tests should migrate from the existing string-based suites (`packages/cli/src/printers/blocks/__tests__/**`) to the next pipeline: use `packages/test-utils/src/next/workspace.test-support.ts` to assert queued writes, cover SSR (manifest/registrar/render stub) and JS-only flows (via `createTsBuilder`), and ensure warnings propagate via the reporter. Do not call the string-based printers from the new tests-assert the AST- and TS-based builders alone generate the files.
