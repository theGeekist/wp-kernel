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

**Phase Deliverables:**

- Update this file's Status Log for the active phase when the work begins and ends.
- Run `pnpm --filter @geekist/wp-kernel-cli build` after changes (TypeScript + Vite) to catch regressions.
- Honour repo invariants (no deep imports, no plain `Error`, etc.) listed in `AGENTS.md`.
- When a phase extends or creates documentation, keep specs (`mvp-cli-spec.md`, discussion notes) in sync.
- **CLI smoke test:** before signing off a phase that touches generation, printers, apply, or command wiring, run the CLI against `app/test-the-cli/kernel.config.ts`: 1. `pnpm --filter @geekist/wp-kernel build && pnpm --filter @geekist/wp-kernel-cli build` 2. `cd app/test-the-cli` 3. `node ../../packages/cli/bin/wpk.js generate --dry-run` 4. `node ../../packages/cli/bin/wpk.js generate`

---

## Phase 1A – IR Enhancements (Route Classification & Policy Hints)

**Spec references:** [MVP Spec §3–4](./mvp-cli-spec.md#3-intermediate-representation-ir)

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

**Status Log:** Started 2025-02-14 – Completed 2025-02-14

---

## Phase 1B – Block Discovery in IR

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

**Status Log:** Started 2025-02-14 – Completed 2025-02-14

---

## Phase 2A – PHP Printer Foundations

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

**Status Log:** _Pending_

---

## Phase 2B – `wp-post` Storage Implementation

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

**Status Log:** _Pending_

**Reference files:** same printer module (`packages/cli/src/printers/php/printer.ts`), storage helpers, and fixtures under `packages/cli/src/printers/__tests__/php-printer.wp-post.test.ts`.

---

## Phase 2C – Remaining Storage Modes

**Spec references:** [MVP Spec §4.3](./mvp-cli-spec.md#43-php-printer-delta)

**Scope:**

- `wp-taxonomy`: term CRUD via `get_terms()`, `wp_insert_term()`, etc.
- `wp-option`: `get_option()`, `update_option()`; unsupported ops return 501
- `transient`: `get_transient()`, `set_transient()`; unsupported ops return 501
- Apply identity/permission defaults consistently.

**Deliverables:** Printer extensions + tests.

**DoD:** Each mode has fixtures; unsupported ops properly guarded.

**Dependencies:** Phase 2B.

**Status Log:** _Pending_

**Reference files:** extend `packages/cli/src/printers/php/printer.ts` plus dedicated fixtures/tests (e.g., `packages/cli/src/printers/__tests__/php-printer.taxonomy.test.ts`).

---

## Phase 3A – JS-Only Block Printer

**Spec references:** [MVP Spec §4.4](./mvp-cli-spec.md#44-block-printers-new)

**Scope:**

- Create `src/printers/blocks/` consuming `ir.blocks` where `ssr === false`.
- Generate `src/blocks/auto-register.ts` with `registerBlockType()` calls and relative imports.
- Wire into `emitGeneratedArtifacts` after UI output.
- Use existing TS formatter.

**Deliverables:** Block printer module + integration tests.

**DoD:** JS-only blocks produce auto-register module with correct imports.

**Dependencies:** Phase 1B.

**Status Log:** _Pending_

**Reference files:** new emitters under `packages/cli/src/printers/blocks/js-only.ts` (or similar) with fixtures in `packages/cli/tests/fixtures/blocks/js-only/**` and integration tests in `packages/cli/src/printers/__tests__/blocks-js.test.ts`.

---

## Phase 3B – SSR Block Manifest & Registrar

**Spec references:** [MVP Spec §4.4](./mvp-cli-spec.md#44-block-printers-new)

**Scope:**

- For `ir.blocks` where `ssr === true`, generate `build/blocks-manifest.php`.
- Generate `inc/Blocks/Register.php` that reads manifest and calls `register_block_type()`.
- Ensure PSR-4 compliance and proper PHP formatting.

**Deliverables:** Extended block printer + tests.

**DoD:** SSR blocks generate manifest + registrar; tests cover mixed SSR/JS-only.

**Dependencies:** Phase 3A.

**Status Log:** _Pending_

**Reference files:** SSR emitters under `packages/cli/src/printers/blocks/ssr.ts`, manifest fixtures in `packages/cli/tests/fixtures/blocks/ssr/**`, and tests in `packages/cli/src/printers/__tests__/blocks-ssr.test.ts`.

---

## Phase 4 – ESLint Plugin Extensions

**Spec references:** [MVP Spec §6](./mvp-cli-spec.md#6-blocks-of-authoring-safety)

**Scope:**

- Extend `eslint-rules/@kernel` with:`wpk/config-consistency`, `wpk/cache-keys-valid`, `wpk/policy-hints`, and `wpk/doc-links`.
- Exercise each rule against CLI-focused fixtures (e.g., generated plugin layouts) stored under `packages/cli/tests/**`; do **not** rely on workspace-root files.
- Integrate the rules into `eslint.config.js` with sensible defaults for the monorepo.
- Document usage and provide ESLint `RuleTester` suites ensuring diagnostics include documentation URLs.

**Deliverables:** Rule implementations, fixture-backed tests, updated lint config/docs.

**DoD:** Running ESLint against the fixtures surfaces the expected diagnostics; docs explain how the rules relate to `kernel.config.ts`.

**Dependencies:** Phase 1A, 1B.

**Status Log:** _Pending_

---

## Phase 5A – `wpk init` Scaffolding

**Spec references:** [MVP Spec §7.1](./mvp-cli-spec.md#7-cli-commands)

**Scope:**

- Replace stub with scaffolding creating: `kernel.config.ts`, `src/index.ts`, `tsconfig.json`, ESLint config, package scripts.
- Respect `--force` flag; abort safely when files exist.

**Deliverables:** Updated `init` command + templates + tests.

**DoD:** `wpk init` creates expected files; tests verify `--force` behavior.

**Status Log:** _Pending_

**Reference files:** `packages/cli/src/commands/init.ts`, template assets under `packages/cli/templates/**`, and tests in `packages/cli/src/commands/__tests__/init-command.test.ts` (or new fixture-backed suites).

---

## Phase 5B – Pipeline Integration & Docs Refresh

**Spec references:** [MVP Spec §7–10](./mvp-cli-spec.md#7-cli-commands)

**Scope:**

- Wire printers into `wpk generate`: Types → PHP → UI → Blocks.
- Wire block artifacts into `wpk apply`.
- Update CLI README with new workflow (single root config, blocks, lint rules).
- Document init → generate → apply flow.

**Deliverables:** Pipeline updates + doc refresh + smoke test docs.

**DoD:** End-to-end workflow succeeds; docs reflect current behavior.

**Dependencies:** Phases 2–4, 5A.

**Status Log:** _Pending_

**Reference files:** CLI entrypoints (`packages/cli/src/commands/generate.ts`, `apply.ts`, `dev.ts`), documentation in `packages/cli/README.md`, and smoke-test fixtures under `packages/cli/tests/pipeline/**`.

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

**Status Log:** _Pending_

**Reference files:** `packages/cli/src/commands/apply.ts`, test harness in `packages/cli/src/commands/__tests__/apply-command.test.ts`, and new fixtures under `packages/cli/tests/fixtures/apply-blocks/**`.

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

**Dependencies:** Phases 1A, 2B–2C.

**Status Log:** _Pending_

**Reference files:** policy detection in `packages/cli/src/ir/build-ir.ts` (new helpers), PHP helper printer additions alongside `packages/cli/src/printers/php/printer.ts`, and fixtures/tests in `packages/cli/tests/policy-map/**`.

---

## Phase 8 – Final QA & Adoption

**Spec references:** Entire MVP spec

**Scope:**

- Regenerate showcase artifacts; capture diffs.
- Audit test coverage across all phases.
- Review documentation alignment (commands, lint rules, examples).
- Integration test: `init` → configure → `generate` → `apply` → verify runtime.
- Prepare CHANGELOG and release notes.

**Deliverables:** QA report + regenerated fixtures + release notes.

**DoD:** All phases complete; docs aligned; ready for release.

**Dependencies:** All prior phases.

**Reference files:** Showcase fixtures under `app/showcase`, smoke test project `app/test-the-cli`, CLI docs in `packages/cli/README.md`, and CHANGELOG updates in `packages/cli/CHANGELOG.md`.

**Status Log:** _Pending_

---

## Quick Reference

| Phase | Focus                  | Dependencies |
| ----- | ---------------------- | ------------ |
| 1A    | IR route + policy meta | –            |
| 1B    | Block discovery        | 1A           |
| 2A    | PHP printer stubs      | 1A           |
| 2B    | `wp-post` CRUD         | 2A           |
| 2C    | Other storage modes    | 2B           |
| 3A    | JS-only blocks         | 1B           |
| 3B    | SSR blocks             | 3A           |
| 4     | ESLint rules           | 1A           |
| 5A    | Init scaffolding       | –            |
| 5B    | Pipeline + docs        | 2–4, 5A      |
| 6     | Block-aware apply      | 3B, 5B       |
| 7     | Policy integration     | 1A, 2B–2C    |
| 8     | Final QA               | All          |
