> Workstream aligned with the [MVP CLI Spec](./mvp-cli-spec.md). Each phase is narrowly scoped so a single agent iteration can complete it without inventing new patterns. Always reference the cited sections before coding.

Test harness: `app/test-the-cli/kernel.config.ts` is a minimal project used for CLI smoke tests. Treat it as throw-away-adjust the config as needed during development but avoid committing transient changes.

Phase 0 audit outcomes are captured in [`docs/mvp-phase-0-checklist.md`](./docs/mvp-phase-0-checklist.md); remaining work begins at Phase 1 below.

---

#### Shared Deliverable Expectations

- Update this file’s Status Log for the active phase when the work begins and ends.
- Keep CLI coverage healthy: run `pnpm --filter @geekist/wp-kernel-cli test --coverage` and ensure branch coverage stays ≥ 89% before closing a phase or the pre-commit hook will fail, and you'd have to do it again.
- Run `pnpm --filter @geekist/wp-kernel-cli build` after changes (TypeScript + Vite) to catch regressions.
- Never bypass pre-commit hooks (`CI=1 git commit …`, wait for completion). If a hook fails, rerun the failed command locally, fix issues, and retry.
- Honour repo invariants (no deep imports, no plain `Error`, etc.) listed in `AGENTS.md`.
- When a phase extends or creates documentation, keep specs (`mvp-cli-spec.md`, discussion notes) in sync.
- **CLI smoke test:** before signing off a phase that touches generation, printers, apply, or command wiring, run the CLI against `app/test-the-cli/kernel.config.ts`:
    1. `pnpm --filter @geekist/wp-kernel build && pnpm --filter @geekist/wp-kernel-cli build`
    2. `cd app/test-the-cli`
    3. `node ../../packages/cli/bin/wpk.js generate --dry-run`
    4. `node ../../packages/cli/bin/wpk.js generate`

### Phase 1 – IR v1 Completion

**Spec references:** [MVP Spec §3–4](./mvp-cli-spec.md#3-intermediate-representation-ir)  
**Scope:**

- Extend `buildIr` to tag each route with a `transport` hint (`'local'` vs `'remote'`) based on path analysis (absolute URLs, namespace mismatch).
- Infer identity defaults when authors omit `resource.identity`, using route placeholders (`:slug`, `:uuid`, `:id`) with fallback warnings.
- Default `schema` to `'auto'` when `storage` is present but no schema is provided; ensure provenance recorded.
- Default cache key segments when `cacheKeys` is missing, mirroring runtime behaviour.
- Populate inferred `storage.postType` for `wp-post` resources lacking an explicit value (warn on truncation or collisions).
- Collect policy identifiers into `ir.policies`, including source metadata for diagnostics.
- Introduce block discovery that scans workspace-relative directories for `block.json` and optional `render.php`, populating `ir.blocks` with `{ key, directory, hasRender, manifestSource }`.
- Ensure discovery obeys workspace/write rules (no traversal outside project root) and ignores `.generated`/`node_modules`; add temp-dir tests covering SSR vs JS-only detection.
- Update IR snapshots/fixtures to include all new metadata (keep deterministic ordering) and expand unit tests to cover inference warnings.

**Deliverables:** Updated `src/ir/build-ir.ts`, block discovery utilities, associated tests/fixtures.  
**DoD:** `pnpm test --filter @geekist/wp-kernel-cli` passes with new assertions; IR JSON golden files updated including block entries.  
**Status Log:** _Pending_.

---

### Phase 2 – PHP Printer Core (`wp-post` inclusive)

**Spec references:** [MVP Spec §4.3](./mvp-cli-spec.md#43-php-printer-delta)  
**Scope:**

- Refactor `packages/cli/src/printers/php/printer.ts` to emit controllers through a dedicated template builder capable of inserting method bodies.
- Integrate inferred identity metadata so route handlers resolve parameters consistently (e.g., `slug`/`uuid` lookups).
- Generate guarded stubs for local routes when storage is absent while skipping remote routes entirely.
- Ensure bootstrap/registration files only register resources with at least one local route.
- Implement full CRUD method bodies for resources with `storage.mode === 'wp-post'`:
    - `list` → `WP_Query` scaffolding, respecting query params (including inferred identity + pagination keys).
    - `get` → `get_post` with identity resolution based on inferred metadata.
    - `create/update/remove` using `wp_insert_post`, `wp_update_post`, `wp_delete_post` and applying meta/taxonomy registration from storage config.
- Use inferred/default permission callbacks (warn on writes without policies), and emit REST argument arrays derived from schema + query params.
- Ensure post type defaults inferred in Phase 1 are honoured, warning when authors override conflicting values.
- Update fixtures/tests to cover both stub resources and `wp-post` CRUD output.

_Note:_ If incremental delivery is preferred, teams may first land the printer refactor + stubs, then follow quickly with `wp-post` CRUD; however, combining them keeps template churn minimal.

**Deliverables:** Updated printer, template utilities, updated tests (ensure coverage).  
**DoD:** Showcase regeneration produces stubs for storage-less resources, full CRUD for `wp-post`, omits remote-only routes; tests assert method structure and permissions.  
**Dependencies:** Phase 1.  
**Status Log:** _Pending_.

---

### Phase 2B – Remaining Storage Modes (`wp-taxonomy`, `wp-option`, `transient`)

**Spec references:** [MVP Spec §4.3](./mvp-cli-spec.md#43-php-printer-delta)  
**Scope:**

- Generate CRUD implementations for non-post storage modes per spec guidance (taxonomy term CRUD, option get/update, transient get/set).
- Ensure unsupported operations (e.g., `create` on transient) return explicit `WP_Error` with TODO message.
- Apply inferred identity and permission defaults consistently across modes.
- Update fixtures covering at least one resource per mode.

**Deliverables:** Printer extensions + tests.  
**DoD:** Each storage mode covered; tests demonstrate correct method bodies or guarded errors.  
**Dependencies:** Phase 2.  
**Status Log:** _Pending_.

---

### Phase 3 – Block Printers

**Spec references:** [MVP Spec §4.4](./mvp-cli-spec.md#44-block-printers-new)  
**Scope:**

- Implement printers that consume `ir.blocks` for both JS-only and SSR entries.
- JS-only blocks: emit `src/blocks/auto-register.ts` (formatted via existing TS formatter) and update `emitGeneratedArtifacts` to include the new output.
- SSR blocks: generate `build/blocks-manifest.php` plus `inc/Blocks/Register.php` using the shared discovery data.
- Ensure manifests include relative paths suitable for runtime registration and update `wpk apply` tests in later phases accordingly.
- Provide integration tests (temp dir) covering mixed JS/SSR blocks to guard against regressions.
- Treat `packages/cli/block.schema.json` strictly as reference documentation; avoid coupling code/tests to schema fields already inferred during discovery.

**Deliverables:** Block printer modules + integration tests.  
**DoD:** JS-only blocks produce an auto-register module; SSR blocks generate manifest and registrar; tests verify content/paths.  
**Dependencies:** Phase 1.  
**Status Log:** _Pending_.

---

### Phase 4 – ESLint Plugin Extensions

**Spec references:** [MVP Spec §6](./mvp-cli-spec.md#6-blocks-of-authoring-safety)  
**Scope:**

- Add rules to the in-repo `@kernel` plugin (`eslint-rules/`) implementing `wpk/config-consistency`, `wpk/cache-keys-valid`, `wpk/policy-hints`, and `wpk/doc-links`.
- Integrate rules into `eslint.config.js` with sensible defaults for the monorepo.
- Provide documentation snippets and unit tests using ESLint’s `RuleTester`.

**Deliverables:** Rule implementations + tests + updated lint config/docs.  
**DoD:** ESLint runs surface new diagnostics on crafted fixtures; documentation explains how rules tie back to `kernel.config.ts`.  
**Dependencies:** Phase 1 (rules rely on IR conventions established earlier).  
**Status Log:** _Pending_.

---

### Phase 5A – `wpk init` Scaffolding

**Spec references:** [MVP Spec §7.1](./mvp-cli-spec.md#7-cli-commands)  
**Scope:**

- Replace the stub init command with scaffolding logic that creates:
    - `kernel.config.ts` template (as per Appendix A of the spec),
    - `src/index.ts` bootstrap calling `configureKernel`,
    - `tsconfig.json` (with `@kernel-config` alias),
    - ESLint config pointing to the repo preset,
    - package scripts (`wpk generate`, `wpk apply`, `wpk dev`).
- Respect `--force` and detect pre-existing files safely.

**Deliverables:** Updated `init` command + templates + tests (temp dir).  
**DoD:** Running `wpk init` in a temp workspace yields expected files; tests ensure rerunning without `--force` aborts safely.  
**Status Log:** _Pending_.

---

### Phase 5B – Pipeline Integration & Docs Refresh

**Spec references:** [MVP Spec §7–10](./mvp-cli-spec.md#7-cli-commands)  
**Scope:**

- Wire new printers into `wpk generate` and `wpk apply` (blocks, PHP, types) ensuring the order matches spec guidance.
- Update CLI README and relevant docs to reflect new workflow (single root config, block handling, lint rules).
- Provide a “from init to generate/apply” smoke test in documentation or scripts.

**Deliverables:** Pipeline adjustments, doc updates, smoke test instructions.  
**DoD:** End-to-end run (`init` → modify config → `generate` → `apply`) succeeds in a temp workspace; docs describe the flow.  
**Dependencies:** Phases 2–4 must be complete.  
**Status Log:** _Pending_.

---

### Phase 6 – Block-Aware Apply Enhancements

**Spec references:** [MVP Spec §7.3](./mvp-cli-spec.md#7-cli-commands)  
**Scope:**

- Teach `wpk apply` to copy block manifests/JS artefacts alongside PHP outputs, with fence checks where applicable.
- Extend `.wpk-apply.log` to record block deployment details.
- Update integration tests covering apply with mixed resource + block output.

**Deliverables:** Apply command updates, tests, and documentation note.  
**DoD:** Apply summary lists block artefacts; tests confirm copied files and log entries.  
**Dependencies:** Phase 3, Phase 5B.  
**Status Log:** _Pending_.

---

### Phase 7 – Policy Map Integration

**Spec references:** [MVP Spec §5](./mvp-cli-spec.md#5-policy-integration)  
**Scope:**

- Define the contract for project-level policy maps (TS export or JSON) and implement detection.
- Emit PHP helpers wiring REST `permission_callback` to generated policy checks; fall back to safe defaults with warnings.
- Add tests demonstrating success, missing policies, and fallback paths.

**Deliverables:** Policy integration modules, printer updates, docs.  
**DoD:** Generated controllers call the policy helper; CLI warns when policies are missing; tests cover map discovery.  
**Dependencies:** Phases 1, 2, 2B.  
**Status Log:** _Pending_.

---

### Phase 8 – Final QA & Adoption

**Spec references:** Entire MVP spec  
**Scope:**

- Regenerate artefacts for the showcase (or sample project) using the new pipeline; capture diffs.
- Ensure documentation, lint rules, and command help are aligned.
- Prepare release notes summarising MVP capabilities.

**Deliverables:** QA report, regenerated fixtures, release note draft.  
**DoD:** All phases above marked complete; QA notes reviewed; ready for release planning.  
**Dependencies:** Phases 1–7.  
**Status Log:** _Pending_.

---

#### Quick Reference Table

| Phase | Focus                       | Dependencies |
| ----- | --------------------------- | ------------ |
| 1     | IR v1 completion            | –            |
| 2     | PHP printer core + wp-post  | 1            |
| 2B    | Remaining storage modes     | 2            |
| 3     | Block printers              | 1            |
| 4     | ESLint plugin rules         | 1            |
| 5A    | Init scaffolding            | –            |
| 5B    | Pipeline integration + docs | 2–4, 5A      |
| 6     | Block-aware apply           | 3, 5B        |
| 7     | Policy map integration      | 1, 2, 2B     |
| 8     | Final QA                    | All prior    |
