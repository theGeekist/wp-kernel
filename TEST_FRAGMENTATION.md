## Findings

- CLI test helpers are fragmented: `createWorkspaceDouble` in `src/dx/readiness/test/test-support.ts` builds its own workspace stub with bespoke defaults instead of reusing the shared mocks, while other suites import separate helpers such as `makeWorkspaceMock` from `@wpkernel/test-utils/workspace.test-support`. The overlap of workspace factories and reporters in multiple files leads to subtly different defaults and drift.
- Package-level helpers like `layout.test-support.ts` and `ir.test-support.ts` embed layout resolution logic, cached manifest parsing, and IR scaffold factories that replicate real pipeline behaviors rather than exercising production code paths. These helpers lock in many workspace/layout strings and assumptions about manifest shape, making tests brittle when layout paths change.
- Jest globals are duplicated and under-leveraged. There are two nearly identical global setups (`jest-global-setup.js` and `jest-global-setup.cjs`) that both install composer deps, yet suites still hand-roll mocks (e.g., file system, timers, reporters) inside individual test-support files instead of a centralised mock registry. This duplication increases maintenance and slows iteration when cross-cutting changes land.
- The `@wpkernel/test-utils` “Like” types (IR, workspace, builder) are diverging from the actual contracts. For example, the workspace “Like” type now includes `ensureDir` and `force` options that don’t exist in the CLI’s `Workspace` contract, and it omits the tighter `WorkspaceLike` defined in `php-json-ast`. These handwritten mirrors will continue to drift as the source types evolve.

## Plan

### Task 1:

**Issue:** Consolidated workspace/test harnesses are missing, leading to parallel mocks and brittle workspace strings.

**Unify workspace test harnesses across CLI tests**:

- Inventory all CLI workspace helpers (`createWorkspaceDouble`, command-level mocks, layout helpers) and map their responsibilities to the shared `@wpkernel/test-utils` workspace and integration APIs.

- Refactor tests to consume a single shared workspace factory (extend `makeWorkspaceMock` if needed) and a single integration runner; delete package-local duplicates and re-export the shared helpers from `packages/cli/tests/workspace.test-support.ts`.

- Replace hard-coded workspace root strings with layout-aware resolvers from the shared helper to reduce string brittleness, and adjust tests accordingly in one pass.

**Completion Notes**:

- Consolidated readiness tests onto shared `makeWorkspaceMock` via CLI test re-export; removed bespoke `createWorkspaceDouble` in readiness test-support and reused shared factory defaults.
- Verified readiness suites with `pnpm test readiness` (18 suites, 79 tests) to ensure unified helper compatibility.

### Task 2:

**Issue:** Test data scaffolds for layout/IR duplicate production logic and bake in path strings.

**Replace bespoke layout/IR fixtures with production loaders**:

- Introduce thin test adapters that call the real layout loader and IR builders with fixture inputs instead of copying logic; wire them through central fixtures under `packages/test-utils` so other packages can reuse them.

- Remove cached manifest parsing from `layout.test-support.ts` and align tests to consume the shared loader; update IR helpers to derive defaults from actual config types rather than DeepPartial copies.

- Add minimal snapshot/fixture coverage to ensure the shared loader emits stable shapes, then delete redundant per-suite factories.

**Completion Notes**:

- Layout test helper now delegates to the production `loadLayoutFromWorkspace` and shares manifest resolution logic via `resolveLayoutFromManifest`; removed bespoke caching and inline manifest parsing in `packages/cli/src/tests/layout.test-support.ts`.
- Introduced a manifest-to-layout resolver export in `packages/cli/src/layout/manifest.ts` to avoid duplicating walk/merge logic across test fixtures.
- `loadTestLayoutSync` now uses the shared resolver against the real `layout.manifest.json`, reducing drift between fixtures and runtime layout resolution.

### Task 3:

**Issue:** Jest global setup and mocking are fragmented.

**Centralize Jest globals and mocks for CLI suites**:

- Collapse the dual global setups into a single ESM entry that handles composer bootstrapping once and exports commonly used mocks (FS, reporters, timers) via `setupFilesAfterEnv`.

- Move shared mocks (reporter harness, file-system fakes, debounce utilities) into `packages/cli/tests` and re-export them so command tests stop declaring their own variants.

- Update suite imports to consume the central mocks, trimming per-suite setup/teardown boilerplate to reduce SLOC and improve change resilience.

**Completion Notes**:

- Removed the duplicate CJS global setup; the ESM `tests/jest-global-setup.js` remains, and a unified `tests/jest.setup.ts` now resets mocks/timers via `setupFilesAfterEnv` (wired in `packages/cli/jest.config.js`).
- Added `@cli-tests/*` alias to TS/Jest for shared test helpers and aligned readiness/apply tests to use it.
- Current per-suite mocks to consolidate:
    - Mock usage is widespread: 55 test files contain `.mock*` calls (503 instances). Highest counts include `src/commands/__tests__/generate.command.test.ts` (55), `start.command.test.ts` (35), `workspace-hygiene.test.ts` (29), `dx/readiness/helpers/__tests__/quickstart.test.ts` (26), and `commands/__tests__/init.workflow.test.ts` (24).
    - `src/utils/__tests__/file-writer.test.ts`: mocks `../path`, `node:fs`.
    - `src/ir/__tests__/createIr.test.ts`: mocks `../../builders`.
    - `src/dx/readiness/helpers/__tests__/phpPrinterPath.test.ts`: mocks `../../../../utils/phpAssets`.
    - `src/commands/__tests__/init.utils.test.ts`: mocks `node:fs/promises`.
    - `src/__tests__/bundler-config.test.ts`: mocks `vite`, `vite-plugin-dts`, `@kucrut/vite-for-wp/utils`.
    - `src/ir/fragments/__tests__/resources.test.ts`: mocks `../../shared/resource-builder`.
    - `src/dx/readiness/helpers/__tests__/phpCodemodIngestion.test.ts`: mocks `../../../../utils/phpAssets`.
    - `src/runtime/__tests__/adapterExtensions.test.ts`: mocks `../../adapters`, `../../builders/ts`, `node:fs/promises`.
    - `src/utils/__tests__/progress.test.ts`: mocks `../../commands/init/timing`.
    - `src/utils/__tests__/reporter.test.ts`: mocks `loglayer`, `@loglayer/transport-simple-pretty-terminal`, `@wpkernel/core/reporter`.
    - `src/builders/ts/__tests__/pipeline.formatter.test.ts`: mocks `../pipeline.builder`.
    - `src/commands/__tests__/init.workflow.test.ts`: mocks `../init/scaffold`, `../init/package-json`, `../init/dependency-versions`, `../init/installers`, `../init/timing`.
    - `src/builders/__tests__/builders.test.ts`: mocks `node:child_process`.
    - `src/builders/__tests__/ts.admin-screen.test.ts`: mocks `../../commands/run-generate/validation`.
    - `src/builders/__tests__/ts.dataview-fixture.test.ts`: mocks `../../commands/run-generate/validation`.
    - `src/builders/__tests__/ts.builder.test.ts`: mocks `../../commands/run-generate/validation`.
    - `src/builders/__tests__/phpBuilder.test.ts`: mocks `@wpkernel/php-json-ast/php-driver`.
    - `src/builders/php/__tests__/pipeline.builder.test.ts`: mocks `../pipeline.codemods`, `../pipeline.writer`.
    - `src/builders/php/__tests__/blocks.test.ts`: mocks `@wpkernel/wp-json-ast`.
    - `src/builders/php/__tests__/controller.storageArtifacts.test.ts`: mocks `@wpkernel/wp-json-ast`.
    - `src/builders/php/__tests__/writer.test.ts`: mocks `@wpkernel/php-json-ast/php-driver`.
    - `src/builders/php/__tests__/generate.integration.test.ts`: mocks `@wpkernel/php-json-ast`.
    - `src/builders/php/__tests__/pipeline.codemods.test.ts`: mocks `@wpkernel/php-json-ast`.

### Task 4:

**Issue:** “Like” types in `@wpkernel/test-utils` are diverging from source contracts, causing long-term drift.

**Generate test-utils 'Like' types from source contracts**:

- Replace handwritten “Like” interfaces with type aliases that reference the source contracts (`@wpkernel/cli`, `@wpkernel/pipeline`, `@wpkernel/php-json-ast`) or derive via `satisfies` helpers, reducing duplication.

- Add a build-time validation step (e.g., a TS project that imports both real and Like types) to detect drift automatically; wire it into `pnpm --filter @wpkernel/test-utils typecheck:tests`.

- Update downstream helpers to use the aliased types; remove fields that don’t exist on the real contracts and add any missing required members.

**Completion Notes**:

- Updated `@wpkernel/test-utils` Like types to alias real CLI/core/php-json-ast contracts and tightened fixtures to satisfy required IR metadata (ids, provenance hashes, layout).
- Pointed test-utils TS paths at built d.ts outputs and patched CLI dist declarations to avoid leaking source `.ts` imports, restoring a clean `pnpm --filter @wpkernel/test-utils typecheck`.
- Added a repo-level guard (`scripts/check-dts-imports.mjs`) wired into build/lint to auto-rewrite and then fail on `.d.ts` files that import `../src`; added `typecheck:test-utils` helper so CI can enforce drift detection alongside the declaration check.

### Task 5:

**Issue:** Test suite size (~27k SLOC) is inflated by variant-heavy helpers and repetitive cases.

**Reduce CLI test SLOC with shared fixtures and table-driven cases**:

- Identify the highest-SLOC suites (start command, workspace, IR) and convert repetitive scenario blocks into parameterized/table-driven tests using shared fixtures.

- Introduce golden-file fixtures for command outputs/layouts so multiple assertions share the same data source rather than re-declaring literals.

- Enforce file size targets (<500 SLOC) by splitting oversized helpers into reusable modules and deleting unused variants; track SLOC reduction by adding a CI check (e.g., `pnpm exec sloc`) to prevent regressions.

**Completion Notes**:

- Discovery snapshot (SLOC, top offenders): pipeline runtime (`runtime/__tests__/pipeline.test.ts`, 1127); patcher apply/skip (`builders/__tests__/patcher.apply.test.ts`, 853; `patcher.skip-and-delete.test.ts`, 716); start command (834); TS blocks builder (832); resourceController PHP builder (783); capability-map IR (720); generate.command (678); validate-wpk-config (659); ts.admin-screen (572); php generate integration (568).
- Discovery snapshot (explicit `jest.mock` counts): highest counts are modest—`init.workflow.test.ts` (5), reporter/adapterExtensions/bundler-config (3 each), a handful of suites at 2–1 mocks. Most per-suite stubbing is via spies/fakes rather than `jest.mock`, reinforcing the need for shared shims instead of inline mocks.
- Next focus: start by parameterizing the top 3–5 suites above and extracting their repeated fixtures; add golden layouts/outputs for start/generate/patcher flows, and introduce a size guard once a few wins land.
- Centralized CLI test harnesses: moved layout/IR/pipeline/start/readiness helpers out of `src/**` into `packages/cli/tests/*`, updated all imports to use `@cli-tests/*`, and pointed workspace fixtures directly at `@wpkernel/test-utils/workspace.test-support` (deleted the re-export). This avoids chasing helpers through re-exports and keeps test-only code out of the build graph.

**Appendix: Tokei snapshot (CLI tests)**:

- Tests-only slice (`*test.{ts,tsx}` under `packages/cli/src` + `packages/cli/tests`): 138 files, ~29,638 total lines (~26,615 code; ~2,947 blanks; ~76 comment lines).
- Largest test files by code lines (tokei `--sort code --files` scoped to tests):
    - `runtime/__tests__/pipeline.test.ts` – 1,023 code
    - `builders/__tests__/patcher.apply.test.ts` – 794
    - `commands/__tests__/start.command.test.ts` – 719
    - `builders/ts/__tests__/blocks.test.ts` – 759
    - `builders/php/__tests__/resourceController.test.ts` – 715
    - `builders/__tests__/patcher.skip-and-delete.test.ts` – 664
    - `ir/__tests__/capability-map.test.ts` – 628
    - `commands/__tests__/generate.command.test.ts` – 604
    - `config/__tests__/validate-wpk-config.test.ts` – 602
    - `builders/php/__tests__/generate.integration.test.ts` – 555
    - `builders/__tests__/ts.admin-screen.test.ts` – 523
    - `apply/__tests__/manifest.test.ts` – 523
    - `builders/__tests__/ts.builder.test.ts` – 509
    - Nearby 400–500 code range: bundles include `bundlerBuilder.test.ts`, `registry.test.ts`, `adapterExtensions.test.ts`, `readiness/*.test.ts`, `shared.blocks.*`, `plan.*`, `builder harness` tests.
- Type consolidation follow-up: readiness/CLI test-support types (DxContext, ReadinessEnvironment) now live in `@wpkernel/test-utils/cli`; CLI tests import helpers via `@cli-tests/*` with no `src/` fallbacks. `@wpkernel/test-utils/dist/types.d.ts` now uses `import type` with `.js` targets to keep `typecheck:tests` clean.

### Task 6:

**Issue:** ~27 `tsconfig*.json` files exist today (build, typecheck, tests, tooling). Divergent compilerOptions and path maps keep breaking Jest/ts-jest resolution and typecheck flows.

**Consolidate TypeScript configs across the monorepo**:

- Inventory every `tsconfig*.json` (root + packages) and group them by role: build/emit, noEmit typecheck, test/typecheck:tests, tooling (eslint/jest).
- Define a small set of shared bases (e.g., `tsconfig.base.json` for src, `tsconfig.typecheck.base.json` for noEmit/package graphs, `tsconfig.test.base.json` for Jest/ts-jest) and refactor package configs to `extends` those instead of duplicating options.
- Normalize path mappings for both src and dist targets in the shared bases so Jest + ts-jest resolve identically across packages; document expected src-vs-dist usage in comments.
- Add a CI guard that fails when a new `tsconfig*.json` appears without being registered in the inventory/owner map, plus a drift check script that ensures each package config extends one of the shared bases.
- Capture the inventory and the “which base to use when” rules in this doc to avoid future fragmentation.

**Completion Notes**:

- ... to be filled
