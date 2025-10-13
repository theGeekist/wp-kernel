# WP Kernel CLI - MVP Implementation Phases

> Workstream aligned with the [MVP CLI Spec](./mvp-cli-spec.md). Each phase is narrowly scoped so a single agent iteration can complete it without inventing new patterns. Always reference the cited sections before coding.

Test harness: `app/test-the-cli/kernel.config.ts` is a minimal project used for CLI smoke tests. Treat it as throw-away; adjust the config as needed during development but avoid committing transient changes.

Phase 0 audit outcomes are captured in [`docs/mvp-phase-0-checklist.md`](./docs/mvp-phase-0-checklist.md); remaining work begins at Phase 1A below.

---

## Implementation Guidance

For PR Summary, this is the **"MVP Sprint"**.

**Scope & Focus:**

It is important you understand your scope for the task you are assigned. The best way to do this is to read all the phases and understand what happens in later phases so you can stay focused on your delivery and not do more.

**Code Quality & Maintenance:**

Please do not extend a module or test file beyond 500 SLOC. It is better to break up the files for better maintenance and ease of debugging but please don't overdo the refactoring bit. Something as simple as a `utils.ts` for helper functions will more than suffice. Focus on the task instead.

**Quality Checks:**

It is prudent to run these checks beforehand, so you don't get stuck. For example, `pnpm --filter @geekist/wp-kernel-cli test --coverage` is very helpful to give you a baseline. If branch coverage drops below 89%, the pre-commit hook will fail it :(

Statistically, your patience pays off, but generally if you write code with low complexity, excellent branch coverage and you meet all the requirements, you wouldn't even have to come to this state.

The hook cycles through `pnpm typecheck` and `pnpm typecheck:tests` and then `pnpm lint --fix`, among other things ensures low functional complexity.

Monitor the output and if it fails, feel free to run the individual commands above to verify your fixes before trying to commit again.

**Commit Process:**

When completed, don't run `git commit --no-verify`, just run `CI=1 git commit ...` and wait for the pre-commit hook to finish.

**Imports & Dependencies:**

Finally you find that imports from other packages are sometimes missing, it usually means you'd have to re-run `pnpm --filter <the dependent package> build` so exports are updated. But this is only when you update other packages and may not be relevant for your task.

**Non-goals / Deferred Work:**

- Dedicated policy helper emission lives in Phase 7 alongside the policy-map contract.
- UI/DataViews scaffolding beyond the existing printers is showcase-specific and not part of the MVP sprint.
- Resource-driven block scaffolding flags (`resource.blocks?.scaffold`, etc.) remain future enhancements; Phase 3 only covers discovery + derived defaults.

**Phase Deliverables:**

- Update this file's Status Log for the active phase when the work begins and ends.
- Run `pnpm --filter @geekist/wp-kernel-cli build` after changes (TypeScript + Vite) to catch regressions.
- Honour repo invariants (no deep imports, no plain `Error`, etc.) listed in `AGENTS.md`.
- When a phase extends or creates documentation, keep specs (`mvp-cli-spec.md`, discussion notes) in sync.
- **CLI smoke test:** before signing off a phase that touches generation, printers, apply, or command wiring, run the CLI against `app/test-the-cli/kernel.config.ts`: 1. `pnpm --filter @geekist/wp-kernel build && pnpm --filter @geekist/wp-kernel-cli build` 2. `cd app/test-the-cli` 3. `node ../../packages/cli/bin/wpk.js generate --dry-run` 4. `node ../../packages/cli/bin/wpk.js generate`

---

## Phase 1A - IR Enhancements (Route Classification & Policy Hints)

**Spec references:** [MVP Spec §3-4](./mvp-cli-spec.md#3-intermediate-representation-ir)

**Scope:**

- Add `transport: 'local' | 'remote'` field to `IRRoute`-classify routes based on absolute URLs or namespace mismatch.
- Infer `resource.identity` from route placeholders (`:id`, `:slug`, `:uuid`) when omitted; emit warnings.
- Default `schema` to `'auto'` when `storage` exists but schema is undefined; record provenance.
- Populate inferred `storage.postType` for `wp-post` resources (format: `namespace-resourceName`); warn on truncation/collisions.
- Add unit tests for route classification, identity inference, schema defaults, and postType warnings.
- Update IR snapshots with new metadata.

**Reference files:** `packages/cli/src/ir/build-ir.ts`, helpers in `packages/cli/src/ir/routes.ts` and the new `packages/cli/src/ir/block-discovery.ts`, with fixtures/tests under `packages/cli/src/ir/__tests__/`.

**Deliverables:** Updated `src/ir/types.ts`, `src/ir/build-ir.ts`, tests/fixtures.

**DoD:** Tests pass; IR golden files updated with transport/identity/postType metadata.

**Status Log:** Started 2025-10-12 - Completed 2025-10-13

---

## Phase 1B - Block Discovery in IR

**Spec references:** [MVP Spec §4 (Blocks subsection)](./mvp-cli-spec.md#4-printers)

**Scope:**

- Create `src/ir/block-discovery.ts` that scans for `block.json` files.
- Check for `render.php` in same directory to set `ssr: true/false`.
- Populate `ir.blocks` with `{ name, directory, ssr, manifestSource }`.
- Respect workspace boundaries; ignore `.generated/`, `node_modules/`.
- Test with temp directories covering SSR, JS-only, and mixed scenarios.

**Reference files:** `packages/cli/src/ir/block-discovery.ts` (new) with tests in `packages/cli/src/ir/__tests__/block-discovery.test.ts` (or similar fixture-backed files).

**Deliverables:** Block discovery module + IR wiring + tests.

**DoD:** `buildIr` on fixtures correctly populates `ir.blocks`; tests cover SSR detection.

**Dependencies:** Phase 1A.

**Status Log:** Started 2025-10-12 - Completed 2025-10-13

---

## Phase 2A - PHP Printer Foundations

**Spec references:** [MVP Spec §4.3](./mvp-cli-spec.md#43-php-printer-delta)

**Scope:**

- Refactor `printers/php/printer.ts` with template builder for method body insertion.
- Generate `WP_Error(501, 'Not Implemented')` stubs for `local` routes; skip `remote` routes.
- Use inferred identity for parameter resolution in stubs.
- Bootstrap only registers resources with ≥1 local route.
- Warn on write routes without policies.

**Reference files:** `packages/cli/src/printers/php/printer.ts` (template builder + stub emitter) with assertions in `packages/cli/src/printers/__tests__/php-printer.stubs.test.ts` (or equivalent).

**Deliverables:** Updated printer + template utilities + tests.

**DoD:** Showcase regeneration produces stubs for local routes; remote-only resources omitted.

**Dependencies:** Phase 1A.

**Status Log:** Started 2025-10-12 - Completed 2025-10-13

---

## Phase 2B - `wp-post` Storage Implementation

**Spec references:** [MVP Spec §4.3](./mvp-cli-spec.md#43-php-printer-delta)

**Purpose:** Replace Phase 2A's 501 stubs with working implementations for `wp-post` storage (the most common mode). Showcase's Job resource provides the reference pattern.

**Scope:**

- Replace stubs with working CRUD for `storage.mode === 'wp-post'`:
    - `list` → `WP_Query` with query params, pagination, identity
    - `get` → `get_post()` with identity resolution
    - `create/update/remove` → `wp_insert_post()`, `wp_update_post()`, `wp_delete_post()` + meta/taxonomy
- Generate REST `args` arrays from schema + query params.
- Honor inferred `postType` from Phase 1A.
- Use Phase 2A's template builder to inject method bodies while preserving structure.

**Deliverables:** PHP printer updates + fixtures + doc snippet.

**DoD:** Generated controllers have working wp-post implementations; tests verify method bodies; showcase regenerates successfully.

**Dependencies:** Phase 2A.

**Status Log:** Started 2025-10-12 - Completed 2025-10-13

**Refactoring Note (Oct 2025):** The original monolithic `wp-post.ts` (1,236 lines) was decomposed into a composable architecture to enable Phase 2C implementation without code duplication. The refactor produced:

- Modular `wp-post/` directory (17 files, 1,350 lines total) with focused generators for each CRUD operation
- Shared PHP printer utilities (rest-args, routes, templates, builders, value-renderer, etc.)
- ~1,750 lines saved across Phase 2C storage modes by reusing shared infrastructure
- Pattern established for future storage mode additions

**Reference files:** `packages/cli/src/printers/php/wp-post/*` (modular structure), shared utilities in `packages/cli/src/printers/php/*.ts`, and comprehensive test suite under `packages/cli/src/printers/php/__tests__/wp-post/*.test.ts`.

---

## Phase 2C - Remaining Storage Modes

**Spec references:** [MVP Spec §4.3](./mvp-cli-spec.md#43-php-printer-delta)

**Scope:**

- `wp-taxonomy`: term CRUD via `get_terms()`, `wp_insert_term()`, etc.
- `wp-option`: `get_option()`, `update_option()`; unsupported ops return 501
- `transient`: `get_transient()`, `set_transient()`; unsupported ops return 501
- Apply identity/permission defaults consistently.

**Deliverables:** Printer extensions + tests.

**DoD:** Each mode has fixtures; unsupported ops properly guarded.

**Dependencies:** Phase 2B.

**Status Log:** Started 2025-10-12 - Completed 2025-10-13

**Implementation Note:** Built on the refactored PHP printer architecture from Phase 2B. Each storage mode follows the composable pattern with focused modules:

- **wp-taxonomy**: ~450 lines across 8 files (context, handlers, methods/\*, helpers, routes, types)
- **wp-option**: 247 lines single file (simple key-value storage)
- **transient**: 233 lines single file (TTL-aware key-value storage)

All modes properly return 501 for unsupported operations and leverage shared infrastructure (REST args, templates, route classification).

**Reference files:**

- `packages/cli/src/printers/php/wp-taxonomy/*` (modular term CRUD)
- `packages/cli/src/printers/php/wp-option.ts` (option storage)
- `packages/cli/src/printers/php/transient.ts` (transient storage)
- Tests: `packages/cli/src/printers/php/__tests__/wp-taxonomy-controller.test.ts`, `wp-option-controller.test.ts`, `transient-controller.test.ts`

---

## Phase 3A - JS-Only Block Printer

**Spec references:** [MVP Spec §4.4](./mvp-cli-spec.md#44-block-printers-new)

**Scope:**

- Create `src/printers/blocks/` consuming `ir.blocks` where `hasRender === false`.
- Generate `src/blocks/auto-register.ts` with `registerBlockType()` calls and relative imports.
- Wire into `emitGeneratedArtifacts` after UI output.
- Use existing TS formatter.
- Keep modules under 500 SLOC (guideline, not hard rule).

**Deliverables:** Block printer module + integration tests.

**DoD:** JS-only blocks produce auto-register module with correct imports.

**Dependencies:** Phase 1B.

**Status Log:** Scaffolded 2025-10-13 - Implementation pending

**File Structure:**

```
packages/cli/src/printers/blocks/
├── index.ts                     # Public API exports
├── types.ts                     # Shared type definitions (~70 lines)
├── js-only.ts                   # JS-only block registration (Phase 3A stub)
├── ssr.ts                       # SSR manifest & registrar (Phase 3B stub)
├── shared/
│   └── template-helpers.ts      # Shared formatting utilities
└── __tests__/
    ├── js-only.test.ts          # Phase 3A tests
    ├── ssr.test.ts              # Phase 3B tests
    └── integration.test.ts      # Mixed SSR/JS-only scenarios
```

**Reference files:** Modular structure follows Phase 2C patterns Stub files created with JSDoc headers and TODO markers for implementation.

---

## Phase 3B - SSR Block Manifest & Registrar

**Spec references:** [MVP Spec §4.4](./mvp-cli-spec.md#44-block-printers-new)

**Scope:**

- For `ir.blocks` where `hasRender === true`, generate `build/blocks-manifest.php`.
- Generate `inc/Blocks/Register.php` that reads manifest and calls `register_block_type()`.
- Ensure PSR-4 compliance and proper PHP formatting.
- Reuse helpers from Phase 3A where possible.
- Try to keep modules & tsts under 500 SLOC

**Deliverables:** Extended block printer + tests.

**DoD:** SSR blocks generate manifest + registrar; tests cover mixed SSR/JS-only.

**Dependencies:** Phase 3A.

**Status Log:** Scaffolded 2025-10-13 - Implementation pending

**Reference files:** Builds on Phase 3A infrastructure. SSR-specific logic in `ssr.ts`, shared utilities in `shared/` subdirectory. Test coverage includes integration scenarios with mixed block types.

---

## Phase 4 - ESLint Plugin Extensions

**Spec references:** [MVP Spec §6](./mvp-cli-spec.md#6-blocks-of-authoring-safety)

**Scope:**

- Extend `eslint-rules/@kernel` with:`wpk/config-consistency`, `wpk/cache-keys-valid`, `wpk/policy-hints`, and `wpk/doc-links`.
- Exercise each rule against CLI-focused fixtures (e.g., generated plugin layouts) stored under `packages/cli/tests/**`; do **not** rely on workspace-root files.
- Integrate the rules into `eslint.config.js` with sensible defaults for the monorepo.
- Document usage and provide ESLint `RuleTester` suites ensuring diagnostics include documentation URLs.

**Deliverables:** Rule implementations, fixture-backed tests, updated lint config/docs.

**DoD:** Running ESLint against the fixtures surfaces the expected diagnostics; docs explain how the rules relate to `kernel.config.ts`.

**Dependencies:** Phase 1A, 1B.

**Status Log:** Started 2025-10-13 - Completed 2025-10-13

**Reference files:** Rule sources in `eslint-rules/`, wiring in `eslint.config.js`, and fixtures/tests in `packages/cli/tests/eslint/`.

---

## Phase 5A - `wpk init` Scaffolding

**Spec references:** [MVP Spec §7.1](./mvp-cli-spec.md#7-cli-commands)

**Scope:**

- Replace stub with scaffolding creating: `kernel.config.ts`, `src/index.ts`, `tsconfig.json`, ESLint config, package scripts.
- Respect `--force` flag; abort safely when files exist.

**Deliverables:** Updated `init` command + templates + tests.

**DoD:** `wpk init` creates expected files; tests verify `--force` behavior.

**Status Log:** Started 2025-10-13 - Completed 2025-10-13

**Reference files:** `packages/cli/src/commands/init.ts`, template assets under `packages/cli/templates/**`, and tests in `packages/cli/src/commands/__tests__/init-command.test.ts` (or new fixture-backed suites).

---

## Phase 5B - Pipeline Integration & Docs Refresh

**Spec references:** [MVP Spec §7-10](./mvp-cli-spec.md#7-cli-commands)

**Scope:**

- Wire printers into `wpk generate`: Types → PHP → UI → Blocks.
- Wire block artifacts into `wpk apply`.
- Update CLI README with new workflow (single root config, blocks, lint rules).
- Document init → generate → apply flow.

**Deliverables:** Pipeline updates + doc refresh + smoke test docs.

**DoD:** End-to-end workflow succeeds; docs reflect current behavior.

**Dependencies:** Phases 2-4, 5A.

**Status Log:** Started 2025-10-13 - Completed 2025-10-13

**Reference files:** CLI entrypoints (`packages/cli/src/commands/generate.ts`, `apply.ts`, `start.ts`, `build.ts`), documentation in `packages/cli/README.md`, and smoke-test fixtures under `packages/cli/tests/pipeline/**`.

---

## Phase 5C - Command Surface Refresh

**Spec references:** [MVP Spec §7](./mvp-cli-spec.md#7-cli-commands)

**Scope:**

- Rename the existing `dev` command to `start`, maintaining a deprecation warning or alias as needed.
- Implement a new `build` command orchestrating `generate` → Vite production build → `apply --yes`, with a `--no-apply` escape hatch.
- Ensure `wpk start` runs generate in watch mode, launches the Vite dev server, and never auto-applies artefacts by default.
- Update CLI reporter output for both commands to keep logs concise and structured.
- Refresh scaffolding templates (`package.json` scripts) and documentation to highlight the new command surface.

**Deliverables:** Updated Clipanion handlers (`packages/cli/src/commands/start.ts`, `build.ts`, shared helpers), template/script updates under `packages/cli/templates/**`, documentation changes, and command-level tests in `packages/cli/src/commands/__tests__/`.

**DoD:**

- `wpk start` triggers generate-on-change and launches Vite; integration harness (Phase 6A) covers the workflow.
- `wpk build` produces a runnable plugin (with default pipeline and `--no-apply` variant).
- Scaffolding/README reflect the new commands and recommended scripts.

**Dependencies:** Phase 5B (pipeline integration) and Phase 6A (integration harness) for testing support.

**Status Log:** Started 2025-02-18 - Completed 2025-02-18

**Reference files:** `packages/cli/src/commands/start.ts`, `build.ts`, existing helpers (`run-generate.ts`, `apply.ts`), scaffolding templates, README/docs.

---

## Phase 6 – Block-Aware Apply Enhancements

**Spec references:** [MVP Spec §7.3](./mvp-cli-spec.md#7-cli-commands)

**Scope:**

- Copy block manifests, registrar, JS outputs via `wpk apply` with fence checks.
- Extend `.wpk-apply.log` to record block deployment.
- Show block counts in apply summary.

**Deliverables:** Apply updates + tests.

**DoD:** Apply copies block artifacts; tests cover mixed resource + block scenarios.

**Dependencies:** Phases 3B, 5B.

**Status Log:** Started 2025-10-13 - Completed 2025-10-13

**Reference files:** `packages/cli/src/commands/apply.ts`, test harness in `packages/cli/src/commands/__tests__/apply-command.test.ts`, and new fixtures under `packages/cli/tests/fixtures/apply-blocks/**`.

---

## Phase 6A – CLI Integration Harness

**Spec references:** [MVP Spec §10](./mvp-cli-spec.md#10-integration-harness--testing-strategy)

**Objective:** Provide first-class command-level integration tests using disposable plugin workspaces (no browser automation required).

**Scope:**

- Add an integration harness helper to `packages/e2e-utils/` (e.g., `createCliWorkspace`) that can:
    - Create temporary workspaces from fixture templates.
    - Execute CLI commands (`wpk generate`, `apply`, `start`, `build`) via child process utilities with predictable logging.
    - Inspect resulting filesystem state (`.generated/**`, `inc/**`, `build/**`, `.wpk-apply.log`).
- Introduce fixture templates under `packages/cli/tests/integration/fixtures/**` representing canonical plugin scenarios (empty plugin, storage-centric, block-heavy).
- Author a Jest suite under `packages/cli/tests/integration/**` that exercises:
    1. `wpk generate` → asserts `.generated/**` contents.
    2. `wpk apply` → verifies `inc/**`, `build/**`, log output, and fence behaviour.
    3. `wpk build` → confirms generate → Vite build → apply pipeline (with `--no-apply` variant).
    4. Optional: lightweight check that `wpk start` boots watcher/Vite (may stub Vite entry).
- Ensure harness utilities clean up workspaces after tests and support future e2e scenarios.

**Deliverables:**

- `packages/e2e-utils/src/cli-workspace.ts` (or similar) providing helper API.
- Integration fixtures under `packages/cli/tests/integration/fixtures/**`.
- Jest integration suite `packages/cli/tests/integration/cli-smoke.test.ts` (or equivalent).
- README / contributing note explaining the new harness and how to run the tests.

**DoD:** Running `pnpm --filter @geekist/wp-kernel-cli test -- --runInBand integration` (or documented command) executes the smoke suite successfully; harness utilities are reusable for future high-level tests.

**Dependencies:** Phase 5B (pipeline integration). Complements Phase 6.

**Status Log:** _Pending_

**Reference files:** `packages/e2e-utils/` (new helpers), `packages/cli/tests/integration/**` (fixtures + suites), existing command tests in `packages/cli/src/commands/__tests__/`.

---

## Phase 7 – Policy Map Integration

**Spec references:** [MVP Spec §5](./mvp-cli-spec.md#5-policy-integration)

**Scope:**

- Define contract for `src/policy-map.ts` (string capabilities or functions).
- Detect and validate policy map during IR build.
- Generate `inc/Policy/Policy.php` helper wiring `permission_callback`.
- Fallback to safe defaults with warnings when map missing.
- Diagnostic for undefined/unused policies.

**Deliverables:** Policy discovery + PHP helper + printer integration + tests.

**DoD:** Controllers use policy helper; CLI warns on missing policies/map.

**Dependencies:** Phases 1A, 2B-2C.

**Status Log:** Started 2025-10-19 - Completed 2025-10-20

**Reference files:** policy detection in `packages/cli/src/ir/build-ir.ts` (new helpers), PHP helper printer additions alongside `packages/cli/src/printers/php/printer.ts`, and fixtures/tests in `packages/cli/tests/policy-map/**`.

---

## Phase 8A – Documentation, Exports & Bundler Hygiene

**Spec references:** [MVP Spec §11](./mvp-cli-spec.md#11-documentation-exports--bundler-hygiene)

**Scope:**

- Harmonise API documentation across packages (kernel, CLI, UI) using consistent JSDoc-driven generation.
- Introduce barrel exports (`index.ts`) for kernel subdirectories and expose them via package `exports` entries (e.g., `@geekist/wp-kernel/events`).
- Update consuming packages to import from those subpath exports instead of the package root or deep relative paths into `src/`.
- Update CLI bundling (Vite/Rollup) to externalise peer dependencies (e.g., `@wordpress/*`, `chokidar`) and lazy-load where beneficial.
- Add regression checks/lints preventing reintroduction of root/deep-relative imports or bundled externals.

**Deliverables:** Revised source exports, import updates, documentation scripts, bundler config changes, and associated tests.

**DoD:**

- `pnpm --filter @geekist/wp-kernel build` succeeds with new export surface; lint/tests pass without deep import warnings.
- Updated docs published via existing pipelines cover CLI/UI/kernels consistently.
- CLI bundle excludes designated externals; before/after stats captured in docs or changelog.

**Dependencies:** Phase 7.

**Status Log:** _Pending_

**Reference files:** `packages/kernel/src/**/index.ts`, package `package.json` exports, doc scripts under `docs/` or `scripts/`, CLI bundler config (`packages/cli/vite.config.ts`).

---

## Phase 8B - Final QA & Adoption

**Spec references:** Entire MVP spec

**Scope:**

- Regenerate showcase artifacts; capture diffs.
- Audit test coverage across all phases.
- Review documentation alignment (commands, lint rules, examples).
- Integration test: `init` → configure → `generate` → `apply` → verify runtime.
- Prepare CHANGELOG and release notes.

**Deliverables:** QA report + regenerated fixtures + release notes.

**DoD:** All phases complete; docs aligned; ready for release.

**Dependencies:** All prior phases including 8A.

**Reference files:** Showcase fixtures under `app/showcase`, smoke test project `app/test-the-cli`, CLI docs in `packages/cli/README.md`, and CHANGELOG updates in `packages/cli/CHANGELOG.md`.

**Status Log:** _Pending_

---

## Quick Reference

| Phase | Focus                        | Dependencies |
| ----- | ---------------------------- | ------------ |
| 1A    | IR route + policy meta       | -            |
| 1B    | Block discovery              | 1A           |
| 2A    | PHP printer stubs            | 1A           |
| 2B    | `wp-post` CRUD               | 2A           |
| 2C    | Other storage modes          | 2B           |
| 3A    | JS-only blocks               | 1B           |
| 3B    | SSR blocks                   | 3A           |
| 4     | ESLint rules                 | 1A           |
| 5A    | Init scaffolding             | -            |
| 5B    | Pipeline + docs              | 2-4, 5A      |
| 5C    | Command surface refresh      | 5B, 6A       |
| 6     | Block-aware apply            | 3B, 5B       |
| 6A    | CLI integration harness      | 5B           |
| 7     | Policy integration           | 1A, 2B-2C    |
| 8A    | Docs/exports/bundler hygiene | 7            |
| 8B    | Final QA & adoption          | All prior    |
