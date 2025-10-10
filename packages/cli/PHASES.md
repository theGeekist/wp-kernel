> Roadmap aligned with the [CLI Specification](./the-cli-idea.md). Each phase references the relevant sections so implementation stays contextual and traceable.

---

#### Shared Deliverable Expectations

- Update the Status Log for the active phase before marking it complete.
- Keep CLI package coverage healthy: rerun `pnpm --filter @geekist/wp-kernel-cli test --coverage` and confirm branch coverage stays ≥ 89% when landing a phase.
- Run `pnpm --filter @geekist/wp-kernel-cli build` (vite + tsc) to catch compile regressions introduced during the phase.
- Document supporting analyses (e.g., Phase 0 audit in `packages/cli/docs/phase-0-baseline-audit.md`) alongside code when a phase requires them.
- Cross-check referenced specs (PHASES.md, `the-cli-idea.md`, discussion docs) after each phase to prevent drift.
- Always run `pnpm build` locally before calling a phase done; it’s fast and ensures the updated code typechecks.
- When committing, use `CI=1 git commit …` (never `git commit --no-verify`) and allow the pre-commit hook to finish; it runs `pnpm typecheck`, `pnpm typecheck:tests`, `pnpm lint --fix`, and a VitePress build. If the hook fails, rerun the individual commands, fix issues, and retry the commit.

---

### Phase 0 - Baseline Audit & Gap Analysis

**Spec references:** [Sections 1 & 7](./the-cli-idea.md#1-source-of-truth--runtime-parity), [Section 3](./the-cli-idea.md#3-configuration-schema-v1)  
**Scope:**

- Catalogue existing configuration usage in `app/showcase/src/kernel.config.ts` and highlight discrepancies with `KernelConfigV1`, including identifier strategies and persistence metadata that would populate `identity` and `storage`.
- Verify composer autoload mappings in current consumers (`app/showcase/composer.json`) align with PSR-4 requirements.
- Produce a gap matrix listing missing fields, version flags, and policy hints.  
  **Deliverables:**
- Audit document stored under `packages/cli/docs/` (or within this file) summarising findings.
- Action items (GitHub issues or TODO list) for each gap.  
   **DoD:** findings reviewed with framework maintainers; no code changes required.  
  **Testing:** none (analysis only).  
  **Parity:** map every config property to runtime usage (resources → `defineResource`, namespace → `configureKernel`).

**Status Log (fill during execution):** Completed - Type & PHP printers implemented with adapter hooks and coverage fixtures / Outstanding - None / Risks & Notes - Ensure future emitters reuse builders for consistency

---

### Phase 1 - Config Loader & Validation

**Spec references:** [Section 2](./the-cli-idea.md#2-cli-architecture), [Section 3](./the-cli-idea.md#3-configuration-schema-v1)

- **Scope:**
- Implement `loadKernelConfig()` using cosmiconfig + tsx fallback, supporting TS/JS and `package.json#wpk`.
- Define Typanion schemas mirroring `KernelConfigV1`, including adapter factories, `identity`, `storage`, and default inference rules (e.g., deriving `store` defaults); emit reporter-driven diagnostics clarifying misconfigurations (route/identity mismatches, unsupported storage modes).
- Reuse kernel namespace helpers to validate/sanitise `namespace` (see `packages/kernel/src/namespace`).
- Validate composer `autoload.psr-4` entries target `inc/`; fail fast with remediation guidance.
- Add unit tests covering success, missing fields, type mismatches, invalid adapter shapes, namespace/autoload failures, and policy key presence checks.

**Deliverables:**

- `src/config/load-kernel-config.ts` (with tests).
- Validation utilities under `src/config/validate-kernel-config.ts`.

**DoD:** `pnpm test --filter @geekist/wp-kernel-cli` passes; loader returns `{ config, sourcePath, configOrigin, composerCheck }`; reporter output includes config origin; namespace is sanitised via kernel helpers.

**Testing:** Jest unit tests + snapshot diagnostics.

**Parity:** Legacy configs missing `version` emit actionable guidance; namespace defaults match runtime behaviour.

**Status Log (fill during execution):** Completed - Phase 2 IR builder implemented / Outstanding - None / Risks & Notes - Deterministic hashing + route validation guard future emitters.

---

### Phase 2 - IR Construction

**Spec references:** [Section 4](./the-cli-idea.md#4-intermediate-representation-ir)

**Scope:**

- Convert validated config into deterministic `IRv1` (sanitised namespace + origin metadata), capturing identifier and storage metadata for each resource.
- Resolve schema paths and load JSON Schema content, generating per-artifact SHA-256 hashes over canonical JSON + normalised EOLs.
- For resources with `schema: 'auto'`, synthesise JSON Schemas from `storage` definitions and annotate provenance.
- Infer policy hints from resource routes and config options; detect duplicate method/path collisions and reserved path usage with actionable errors.
- Populate adapter context with derived IR (including sanitized namespace) for later phases.
- Sort IR nodes deterministically (namespace → resource name → method/path) prior to serialisation.

**Deliverables:**

- `src/ir/build-ir.ts` with associated type definitions under `src/ir/types.ts`.
- Fixture-based tests comparing produced IR against golden JSON.
- Config→IR mapping appendix (within this roadmap or spec).

**DoD:** IR builder handles multiple resources, exposes IR to adapters, hashes each node (canonical JSON), applies deterministic sorting, rejects duplicate/reserved routes, records identifier/storage metadata (including synthesised schemas), flags identity/route/schema conflicts, and golden snapshots remain identical across runs.

**Testing:** Jest golden-file comparisons, path resolution edge cases.

**Parity:** Sanitised namespace matches runtime; appendix documents mapping for each IR field.

**Status Log (fill during execution):** Completed - Type & PHP printer foundations implemented with adapter hooks and tests / Outstanding - None / Risks & Notes - Extend coverage to additional emitters in later phases

---

### Phase 3 - Printers Foundation (Types & PHP)

**Spec references:** [Section 5](./the-cli-idea.md#5-printers--emitters), [Section 7](./the-cli-idea.md#7-safety--guardrails)

**Scope:**

- Implement type printer using `json-schema-to-ts`, writing to `.generated/types` and aggregating via `.generated/types/index.d.ts`. Synthesised schemas (`'auto'`) must produce the same surface as author-provided files.
- Build minimal PHP AST + renderer supporting base controller and resource controllers, with Prettier formatting, provenance headers, and guard comments.
- Generate REST args arrays leveraging schema data; infer from synthesised schema when storage drives generation.
- Emit persistence registration files (e.g., CPT/meta/taxonomy/option setup) honouring `storage` defaults, and ensure controllers resolve identifiers per `identity` (numeric ID vs slug/uuid lookup).
- Honour adapter `customise` callbacks before formatting output.
- Emit `.generated/php/index.php` to enumerate generated classes for bootstrap usage.

**Deliverables:**

- `src/printers/types.ts`, `src/printers/php/controllers.ts`, `src/printers/php/base.ts`, `src/printers/php/rest-args.ts`, and aggregator emitters.
- Golden fixtures comparing generated files to expected outputs (based on showcase).
- Updated Status Log entry for this phase.

**DoD:** Generated files match formatting expectations; `.generated/types/index.d.ts` emitted; PHP headers include config provenance and sanitised namespace; persistence registrations and controllers align with `identity`/`storage`; `php -l` passes.

**Testing:** Jest snapshot tests and formatting smoke tests.

**Parity:** Generated controllers align with showcase working copies; differences documented/back-ported.

**Status Log (fill during execution):** Completed - Type & PHP printers shipped via `emitGeneratedArtifacts` (adapter customisation path verified); Outstanding - None; Risks & Notes - Future emitters should reuse shared builders and replace the current `json_decode` payloads with native PHP array builders for friendlier DX.

---

### Phase 4 - `wpk generate` Command

**Spec references:** [Section 6 – `wpk generate`](./the-cli-idea.md#6-commands)

**Scope:**

- Wire loader, IR, and printers behind Clipanion command.
- Implement filesystem writer that mirrors `.generated/**` layout and reports changes via reporter.
- Evaluate adapters before printing so overrides run.
- Provide exit codes and structured log summaries.
- Detect unchanged files via content hash to avoid unnecessary writes.
- Invoke the full pipeline (`loadKernelConfig` → `validateKernelConfig` → `buildIr` → `emitGeneratedArtifacts`) and honour `ir.php` metadata (namespace, autoload, output directory).
- Pass adapter factories from config through to printers so customisations execute.

**Deliverables:**

- `src/commands/generate.ts` + integration tests using temporary directories.
- Updated Status Log entry for this phase.
- Golden fixtures asserting `.generated/types/**` and `.generated/php/**` outputs.

**DoD:** Running the command in showcase reproduces existing `.generated` outputs; reporter summary includes counts (written/unchanged/skipped) and respects dry-run/verbose modes; exit codes 0/1/2 verified; identity- and storage-driven defaults surface in generated artifacts; CLI package branch coverage remains ≥ 89%.

**Testing:** Integration tests (Jest) with temp dirs verifying file contents, hashes, exit codes, and reporter modes.

**Parity:** CLI usage documented in README; generated artifacts respect adapter overrides, sanitised namespace, and the canonical identifier/persistence defaults.

**Status Log (fill during execution):** Completed - generation pipeline wired with FileWriter + integration tests; Outstanding - None; Risks & Notes - Prettier and its PHP plugin stay peer deps and are externalised from the bundle (ensure they’re installed when invoking the CLI).

---

### Phase 5 - `wpk apply` Command

**Spec references:** [Section 6 – `wpk apply`](./the-cli-idea.md#6-commands)

**Scope:**

- Implement apply logic that copies `.generated/php` → `inc/` while respecting `WPK:BEGIN/END AUTO` markers.
- Enforce clean `.generated` state or support `--yes` override.
- Produce `.wpk-apply.log` summarising actions.
- Offer `--backup` (writes `.bak` before overwrite) and `--force` for guarded sections.
- Post-apply validation: PSR-4 namespace/path consistency and detection of manual edits inside AUTO regions.

**Deliverables:**

- `src/commands/apply.ts`, merge utility for guard sections, log writer.
- Updated Status Log entry for this phase.

**DoD:** Integration tests covering: clean apply, custom code preservation, abort on dirty state, `--yes` and `--backup` behaviour; edits inside AUTO fail without `--force`; PSR-4 check passes.

**Testing:** Jest integration tests with fixture repositories and pre/post-apply validation.

**Parity:** Result matches manual PHP structure with sanitised namespace; documentation updated for apply workflow.

**Status Log (fill during execution):** Completed - Sandbox extension manager with tests and telemetry example / Outstanding - None / Risks & Notes - Ensure future emitters reuse queueFile helpers

---

### Phase 5a - PHP Printer DX Improvements

**Spec references:** [Section 5 – Printers](./the-cli-idea.md#5-printers--emitters)

**Scope:**

- Replace the JSON-string emission in PHP controllers and the persistence registry with native PHP array builders to improve readability and maintainability.
- Ensure the generated array structures preserve ordering, identity annotations, and schema metadata currently encoded inside the `json_decode` strings.
- Update documentation/comments to reflect the new code structure so developers know where to edit if manual tweaks are required.
- Keep array formatting stable (respect indentation, guard comments, and docblocks) so diffs stay clean when regening.

**Deliverables:**

- Refactored printer helpers that render REST args and persistence payloads as PHP arrays, plus supporting unit tests.
- Updated integration tests validating that generated PHP files match golden fixtures with readable array structures.
- Updated Status Log entry for this phase.

**DoD:** CLI printers emit PHP arrays instead of JSON strings; regenerated showcase assets remain semantically identical; new fixtures cover both manual and auto schemas; CLI package branch coverage stays ≥ 89%.

**Testing:** Jest unit + integration tests comparing generated PHP against updated golden fixtures.

**Parity:** PHP output retains all current metadata (routes, identity, storage) while being readable for developers editing controllers.

**Status Log (fill during execution):** Completed - / Outstanding - / Risks & Notes -

---

### Phase 6 - Watch Mode (`wpk dev`)

**Spec references:** [Section 6 – `wpk dev`](./the-cli-idea.md#6-commands)

**Scope:**

- Add chokidar-based watcher that triggers regenerate on config/schema/resource/block changes.
- Support optional auto-apply for JS build artifacts (not PHP) with `--auto-apply-php` opt-in.
- Re-evaluate adapters on every change so overrides stay in sync.
- Implement debounce tiers (fast path for config/route changes, slow path for schema modifications touching types/REST args/controllers).
- Handle reporter throttling and graceful shutdown.

**Deliverables:**

- `src/commands/dev.ts`, watcher utility, debounce mechanism.
- Updated Status Log entry for this phase.

**DoD:** Manual smoke test + mocked unit tests; debounced rebuild by file type; adapters hot-reloaded; clean SIGINT shutdown.

**Testing:** Jest using fake timers and mocked FS events.

**Parity:** Namespace changes propagate without restart; PHP auto-apply remains opt-in.

**Status Log (fill during execution):** Completed - / Outstanding - / Risks & Notes -

---

### Phase 7 - Adapter Extensions & Future Hooks

**Spec references:** [Sections 3 & 5](./the-cli-idea.md#3-configuration-schema-v1), [Section 5](./the-cli-idea.md#5-printers--emitters)

**Scope:**

- Formalise optional extension points (e.g., additional file emitters) building on the adapter context.
- Provide helper utilities so adapters can append files or modify IR safely while remaining config-driven.
- Ensure adapter failures are isolated (temp directories + rollback) and logged with reporter.

**Deliverables:**

- Extension manager module + tests verifying execution order and error handling.
- Example adapter extension (e.g., telemetry stub) documented for consumers.
- Updated Status Log entry for this phase.

**DoD:** Adapter execution order deterministic (config order); failures produce exit code 3 with zero partial writes (temp swap); logs highlight failing adapter.

**Testing:** Jest with spy reporters, error scenarios, and golden output comparisons.

**Parity:** Config typings/docs updated; extensions cannot diverge from single source of truth.

**Status Log (fill during execution):** Completed - / Outstanding - / Risks & Notes -

---

### Phase 7a - Adapter Recipe & Slot System

**Spec references:** [Adapter DX Specification](./docs/Adapter%20DX%20Specification.md)

**Scope:**

- Introduce the `PhpRecipeBuilder` API so adapters compose recipes (namespace imports, controller hooks, REST args, batch endpoints) without touching AST.
- Extend printers to emit named WPK slots and merge contributions deterministically.
- Add optional `wpk analyze-php` command that produces read-only JSON describing existing PHP (classes, methods, slots) via `glayzzle/php-parser`.
- Provide scaffolding/test harness (`wpk adapter scaffold/test`) for adapter authors.

**Deliverables:**

- Recipe builder implementation with unit tests.
- Printer updates supporting named slots and deterministic merges.
- Analysis CLI command + documentation.
- Adapter scaffolding & test commands (`wpk adapter scaffold/test`) with fixtures.
- Updated Status Log entry for this phase.

**DoD:** Adapters can target named slots via recipes; generated PHP remains stable and readable; analysis command outputs usable JSON; CLI coverage ≥ 89%.

**Testing:** Jest unit tests for builder + analysis; integration tests verifying adapter recipes produce expected `.generated/php/**`.

**Parity:** Existing adapters continue to work; new recipe API enables richer DX without exposing AST.

**Status Log (fill during execution):** Completed - / Outstanding - / Risks & Notes -

---

### Phase 8 - Documentation, Adoption & QA

**Spec references:** [Section 8 & 9](./the-cli-idea.md#8-testing-strategy), [Section 9](./the-cli-idea.md#9-documentation--adoption)

**Scope:**

- Update CLI README with examples; integrate showcase workflow (replace manual scripts).
- Provide migration guide for existing projects adopting the CLI.
- Run end-to-end validation (generate + apply) on showcase and at least one additional sample.
- Generate command reference (`wpk --help`) into Markdown for docs site.
- Add showcase CI “golden run” (generate → assert no diff on `.generated/**`; apply → check PSR-4 + build layout).

**Deliverables:**

- README updates, migration docs, changelog entries, optional demo recording.
- CLI reference doc generated from command metadata.
- Updated showcase `.generated/**` committed via CLI.
- Updated Status Log entry for this phase.

**DoD:** CLI reference generated from `wpk --help`; showcase “golden run” CI job (generate → no diff; apply → PSR-4 check) passes; documentation reviewed.

**Testing:** Manual QA + automated tests from previous phases running in CI.

**Parity:** Runtime behaviour unchanged compared to pre-CLI scaffold; docs describe namespace-aware defaults.

**Status Log (fill during execution):** Completed - / Outstanding - / Risks & Notes -
