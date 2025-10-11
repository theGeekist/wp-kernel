> Workstream aligned with the [MVP CLI Spec](./mvp-cli-spec.md). Each phase is narrowly scoped so a single agent iteration can complete it without inventing new patterns. Always reference the cited sections before coding.

Test harness: `app/test-the-cli/kernel.config.ts` is a minimal project used for CLI smoke tests. Treat it as throw-away-adjust the config as needed during development but avoid committing transient changes.

Phase 0 audit outcomes are captured in [`docs/mvp-phase-0-checklist.md`](./docs/mvp-phase-0-checklist.md); remaining work begins at Phase 1A below.

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

### Phase 1A – IR Enhancements (Route Classification & Policy Hints)

**Spec references:** [MVP Spec §3–4](./mvp-cli-spec.md#3-intermediate-representation-ir) \n**Scope:**

- Extend `buildIr` to tag each route with a `transport` hint (`'local'` vs `'remote'`) based on path analysis (absolute URLs, namespace mismatch).
- Infer identity defaults when authors omit `resource.identity`, using route placeholders (`:slug`, `:uuid`, `:id`) with fallback warnings.
- Default `schema` to `'auto'` when `storage` is present but no schema is provided; ensure provenance recorded.
- Default cache key segments when `cacheKeys` is missing, mirroring runtime behaviour.
- Populate inferred `storage.postType` for `wp-post` resources lacking an explicit value (warn on truncation or collisions).
- Collect policy identifiers into `ir.policies`, including source metadata for diagnostics.
- Add unit tests ensuring duplicate routes, reserved prefixes, missing policies, and inference fallbacks surface actionable `KernelError`s or warnings.
- Update IR snapshots/fixtures to include the new metadata (keep deterministic ordering).

**Deliverables:** Updated `src/ir/build-ir.ts`, associated tests/fixtures. \n**DoD:** `pnpm test --filter @geekist/wp-kernel-cli` passes with new assertions; IR JSON golden files updated. \n**Status Log:** _Pending_.

---

### Phase 1B – Block Discovery in IR

**Spec references:** [MVP Spec §4 (Blocks subsection)](./mvp-cli-spec.md#4-printers) \n**Scope:**

- Introduce a block discovery helper that scans workspace-relative directories for `block.json` and optional `render.php`.
- Populate `ir.blocks` with entries `{ key, directory, hasRender, manifestSource }`.
- Ensure discovery obeys workspace/write rules (no traversal outside project root) and ignores `.generated`/`node_modules`.
- Surface per-block provenance so printers can choose SSR vs client-only behaviour.
- Add tests using temp directories validating SSR vs JS-only detection.

**Deliverables:** Block discovery module + IR wiring + tests. \n**DoD:** Running `buildIr` on fixtures captures block entries; tests cover SSR vs JS-only/missing render cases. \n**Dependencies:** Phase 1A (IR baseline) should be complete. \n**Status Log:** _Pending_.

---

### Phase 2A – PHP Printer Foundations

**Spec references:** [MVP Spec §4.3](./mvp-cli-spec.md#43-php-printer-delta) \n**Scope:**

- Refactor `packages/cli/src/printers/php/printer.ts` to emit controllers through a dedicated template builder capable of inserting method bodies.
- Integrate inferred identity metadata so route handlers resolve parameters consistently (e.g., `slug`/`uuid` lookups) even in stub mode.
- Generate guarded stubs for every local route (methods return `WP_Error( 501, 'Not Implemented' )`) while skipping remote routes entirely.
- Ensure bootstrap/registration files only register resources with at least one local route.
- Use inferred/default permission callbacks (warn on writes without policies) even in stub mode.
- Update fixtures/tests to reflect stub output (no real CRUD yet).

**Deliverables:** Updated printer, template utilities, updated tests (ensure coverage). \n**DoD:** Showcase regeneration produces stubs for local routes and omits remote-only resources; tests assert stub structure. \n**Dependencies:** Phase 1A. \n**Status Log:** _Pending_.

---

### Phase 2B – `wp-post` Storage Implementation

**Spec references:** [MVP Spec §4.3](./mvp-cli-spec.md#43-php-printer-delta) \n**Scope:**

- Implement CRUD method bodies for resources with `storage.mode === 'wp-post'`:
    - `list` → `WP_Query` scaffolding, respecting query params (including inferred identity + pagination keys).
    - `get` → `get_post` with identity resolution based on inferred metadata.
    - `create/update/remove` using appropriate `wp_insert_post`, `wp_update_post`, `wp_delete_post` and applying meta/taxonomy registration from storage config.
- Generate REST argument arrays from schema + query params.
- Ensure post type defaults inferred in Phase 1A are honoured, and warn when authors override conflicting values.
- Add unit/golden tests verifying emitted PHP for a representative resource.

**Deliverables:** PHP printer updates + fixtures + docs snippet showing emitted code. \n**DoD:** Generated controllers include real implementations for `wp-post` resources; tests assert method bodies. \n**Dependencies:** Phase 2A. \n**Status Log:** _Pending_.

---

### Phase 2C – Remaining Storage Modes (`wp-taxonomy`, `wp-option`, `transient`)

**Spec references:** [MVP Spec §4.3](./mvp-cli-spec.md#43-php-printer-delta) \n**Scope:**

- Generate CRUD implementations for non-post storage modes per spec guidance (taxonomy term CRUD, option get/update, transient get/set).
- Ensure unsupported operations (e.g., `create` on transient) return explicit `WP_Error( 501, 'Not Implemented' )`.
- Apply inferred identity and permission defaults consistently across modes.
- Update fixtures covering at least one resource per mode.

**Deliverables:** Printer extensions + tests. \n**DoD:** Each storage mode covered; tests demonstrate correct method bodies or guarded errors. \n**Dependencies:** Phase 2B. \n**Status Log:** _Pending_.

---

### Phase 3A – JS-Only Block Printer

**Spec references:** [MVP Spec §4.4](./mvp-cli-spec.md#44-block-printers-new) \n**Scope:**

- Implement a printer that consumes `ir.blocks` entries without `render.php`, emitting `src/blocks/auto-register.ts` and ensuring it’s formatted via existing TS formatter.
- Add fixtures verifying generated module content and relative import paths.
- Update `emitGeneratedArtifacts` to call the block printer after UI output.

**Deliverables:** New printer module + integration tests (temp dir). \n**DoD:** JS-only blocks produce an auto-register module; integration test regenerates expected files. \n**Dependencies:** Phase 1B. \n**Status Log:** _Pending_.

---

### Phase 3B – SSR Block Manifest & Registrar

**Spec references:** [MVP Spec §4.4](./mvp-cli-spec.md#44-block-printers-new) \n**Scope:**

- Extend the block printer to create `build/blocks-manifest.php` and `inc/Blocks/Register.php` for entries flagged `hasRender`.
- Ensure manifest includes relative paths suitable for runtime registration.
- Add fixtures/tests validating PHP formatting and manifest contents.

**Deliverables:** Extended block printer + tests. \n**DoD:** SSR blocks generate both manifest and registrar; regression tests cover multiple blocks. \n**Dependencies:** Phase 3A. \n**Status Log:** _Pending_.

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
**Dependencies:** Phase 3B, Phase 5B.  
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
**Dependencies:** Phases 1A, 2B–2C.  
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
**Dependencies:** Phases 0–7.  
**Status Log:** _Pending_.

---

#### Quick Reference Table

| Phase | Focus                       | Dependencies |
| ----- | --------------------------- | ------------ |
| 1A    | IR route + policy metadata  | –            |
| 1B    | Block discovery             | 1A           |
| 2A    | PHP printer stubs           | 1A           |
| 2B    | `wp-post` CRUD              | 2A           |
| 2C    | Remaining storage modes     | 2B           |
| 3A    | JS-only block printer       | 1B           |
| 3B    | SSR block manifest          | 3A           |
| 4     | ESLint plugin rules         | 1A, 1B       |
| 5A    | Init scaffolding            | –            |
| 5B    | Pipeline integration + docs | 2–4, 5A      |
| 6     | Block-aware apply           | 3B, 5B       |
| 7     | Policy map integration      | 1A, 2B, 2C   |
| 8     | Final QA                    | All prior    |
