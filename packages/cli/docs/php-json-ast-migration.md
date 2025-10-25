# PHP JSON AST Migration Plan

## Overview

We want the next-gen CLI pipeline to emit PHP artefacts through a canonical JSON AST surface keyed to `nikic/PHP-Parser`. Today the new builder still relies on the legacy string-based printer (`PhpFileBuilder`) and then re-parses the emitted code to produce `.ast.json`. This migration replaces that brittle layer with first-class AST builders so downstream helpers (patcher, apply command, tooling) can rely on deterministic structures.

_Status tracking:_ When a phase below is completed, record the outcome in this file **and** update the summary section in `packages/cli/docs/next-cli.md` so other contributors see the latest state.

## Goals

- Eliminate the legacy `PhpFileBuilder`/string templates in favour of AST builders that match `nikic/PHP-Parser` output.
- Produce PHP source _and_ JSON AST directly, without the “render → reparse” cycle.
- Preserve all existing business logic (meta/taxonomy helpers, policy guards, identity handling) while changing only the emission surface.
- Lock parity with the legacy pipeline via golden fixtures and integration tests.
- Document the new AST contract for contributors and extension authors.

## Non-Goals

- Rewriting business rules around post/taxonomy/policy behaviour.
- Changing CLI command UX, apply semantics, or workspace APIs.
- Shipping additional Vite/build orchestration (tracked separately).
- Dropping `.ast.json` outputs-the format remains, only the authoring changes.

## Current State (baseline)

- `createPhpBuilder()` now orchestrates AST-first helpers (resource controller, policy helper, persistence registry, index file) and queues `PhpProgram` payloads for the writer; no string-based builders remain under `packages/cli/src/next`.【F:packages/cli/src/next/builders/php/builder.ts†L1-L78】【F:packages/cli/src/next/builders/php/printers.ts†L1-L10】
- JSON AST files are emitted directly from the queued `PhpProgram` via the driver pretty printer, which returns both source and AST so the pipeline no longer reparses rendered strings.【F:packages/cli/src/next/builders/php/writer.ts†L1-L76】
- Unit tests now exercise the AST helper pipeline (`packages/cli/src/next/builders/__tests__/phpBuilder.test.ts`), while the legacy string printers and their tests remain under `packages/cli/src/printers/php/**` for the legacy CLI until they are migrated or removed.【F:packages/cli/src/next/builders/**tests**/phpBuilder.test.ts†L1-L228】【F:packages/cli/src/printers/php/**tests**/wp-post/basic-controller.test.ts†L1-L134】
- Integration test `packages/cli/src/next/builders/__tests__/phpBuilder.test.ts:52` asserts the PHP output and JSON AST exist but they’re generated via the pretty-printer bridge.

## Target Architecture

### Canonical AST Schema

- Definitions live in `packages/cli/src/printers/php/ast.ts` and mirror the upstream PHP structures found in `packages/cli/vendor/nikic/php-parser/lib/PhpParser`.
- The schema follows the JSON representation documented in `packages/cli/docs/JSON_representation.md`, using the canonical node type names (`Stmt_Class`, `Expr_Array`, etc.).
- Factory helpers (e.g. `createIdentifier`, `createClass`, `createArray`) let printers construct nodes without duplicating boilerplate.
- The upstream source is available inside the repo, so future schema tweaks should diff against the vendor library before landing.

### Printer Surface Rewrite

1. Remove/replace `PhpFileBuilder` (`packages/cli/src/printers/php/builder.ts:1`). Introduce helper modules that create AST fragments rather than string templates.
2. Update shared helper utilities:
    - `createMethodTemplate`, `appendMethodTemplates`, `renderPhpReturn`, docblock utilities → emit AST nodes (`packages/cli/src/printers/php/builder-helpers.ts:1`, `packages/cli/src/printers/php/template.ts:1`, `packages/cli/src/printers/php/value-renderer.ts:1`, `packages/cli/src/printers/php/docblock.ts:1`).
    - Route helpers (`packages/cli/src/printers/php/routes.ts:7`) should create AST statements instead of template strings.
3. Convert domain printers (`wp-post/*`, `wp-taxonomy/*`, `wp-option/*`, `transient/*`, base controller, policy helper, persistence registry, index file - see `packages/cli/src/printers/php/wp-post/handlers.ts:1`, `packages/cli/src/printers/php/wp-taxonomy/index.ts:1`, `packages/cli/src/printers/php/wp-option/index.ts:1`, `packages/cli/src/printers/php/transient/index.ts:1`, `packages/cli/src/printers/php/base-controller.ts:1`, `packages/cli/src/printers/php/policy-helper.ts:1`, `packages/cli/src/printers/php/persistence-registry.ts:1`, `packages/cli/src/printers/php/index-file.ts:1`) to return `PhpNode` structures.
4. Ensure docblocks become proper comment nodes (`Stmt_Nop` w/ attributes) in the AST, consistent with `nikic`.
5. Remove `createPhpPrettyPrinter` dependency from printers-only `writePhpArtifact` should call it for pretty-printing final code (`packages/cli/src/next/builders/phpBridge.ts:41`).

### Builder/Bridge Updates

- Change `writePhpArtifact` (`packages/cli/src/printers/php/writer.ts`) to accept a `PhpProgram` AST. It should:
    1. Serialize the AST to JSON (`JSON.stringify`).
    2. Pass the AST directly to the pretty-printer bridge (`createPhpPrettyPrinter`) so the PHP code is generated without re-parsing raw strings.
    3. Persist both the PHP code and the canonical JSON (already formatted) to disk.
- Update `createPhpBuilder` (`packages/cli/src/next/builders/php.ts`) to reflect the new return type (no more `builder.toAst()`).
- Remove legacy-only helpers once the migration lands (e.g. `PhpFileBuilder`, `builder-helpers.ts` string-based APIs).

## Implementation Phases

### Phase 0 – Schema Validation (owner: groundwork engineer)

#### Expected Outcomes

- `packages/cli/src/printers/php/ast.ts` remains in sync with the upstream PHP parser definitions (`packages/cli/vendor/nikic/php-parser/lib/PhpParser`) and the documented JSON contract (`packages/cli/docs/JSON_representation.md`).
- A unit test exercises a sample AST produced by the vendor parser and asserts structural compatibility with the TypeScript schema (e.g. verifying node type names, required keys).
- Any deviations or gaps are corrected and outcomes documented here.

#### Tasks

1. Diff our schema against the vendor sources / JSON doc and adjust as needed.
2. Add the validation test (round-trip fixture or schema assertion).
3. Update documentation with findings and mark this phase as completed once the test passes.

### Phase 1 – Printer Conversion (owner: migration engineer / cloud agent)

#### Expected Outcomes

- All printers under `packages/cli/src/printers/php/**` emit `PhpNode` structures from `ast.ts`; `PhpFileBuilder` and string templates are retired.
- `emitPhpArtifacts` composes the new AST nodes and no longer depends on string concatenation.
- Existing unit tests are updated (and new ones added where needed) to assert the AST output shape.
- This doc and `packages/cli/docs/next-cli.md` are updated to reflect completion.

#### Tasks

1. Replace legacy builder usage with AST helpers module by module.
2. Update tests to target AST output (snapshots or structural assertions).
3. Remove defunct utilities and confirm CI passes.
4. Mark the phase as complete in both documentation files.

### Phase 2 – Builder & Bridge Integration

#### Expected Outcomes

- `writePhpArtifact` writes PHP and JSON AST directly from the new node structures; no render → reparse cycle remains.
- `createPhpBuilder` queues both artefacts from the canonical AST without hitting legacy code paths.
- Any obsolete exports/helpers are removed; tests verify the new flow.
- Documentation is updated to show this phase is finished.

#### Tasks

1. Refactor `writePhpArtifact` / `createPhpBuilder` to use the AST structures.
2. Remove references to legacy builders.
3. Ensure integration tests cover the new flow.
4. Record completion in this document and `next-cli.md`.

### Phase 3 – Validation & Cleanup

#### Expected Outcomes

- Golden fixtures demonstrate parity between the legacy outputs and the new AST-first pipeline (both PHP source and JSON AST).
- Tests enforce schema conformity and guard against regressions.
- Documentation (`next-cli.md`, this plan, CHANGELOG) reflects the completed migration; legacy builder files are deleted.

#### Tasks

1. Generate fixtures, wire them into tests, and document regeneration steps.
2. Extend `phpBuilder.test.ts` and/or new suites to validate schema + parity.
3. Clean up obsolete files and exports.
4. Update docs/CHANGELOG and mark this phase complete.

## Testing Plan

- `pnpm --filter @wpkernel/cli test` (unit + integration).
- Golden fixture diffing for PHP + AST outputs.
- New tests for AST factory helpers (ensuring they mirror `nikic` structures).
- If feasible, add a sanity test that loads the emitted JSON and runs it through `nikic` to guarantee validity (optional, integration-only).

## Documentation & Tooling Updates

- Document the AST schema and helper APIs in `/docs` (link from `next-cli.md`).
- Update API docs (`docs/api/generated/@wpkernel/cli/...`) once exports change.
- Note the migration in `packages/cli/CHANGELOG.md`.

## Risks & Mitigations

- **Risk:** Missing node fields → pretty-printer rejects AST.  
  _Mitigation:_ Pair conversions with fixtures generated from `nikic` to ensure parity.
- **Risk:** Golden fixtures become stale.  
  _Mitigation:_ Document regeneration steps (e.g., script hooking the legacy CLI to emit artefacts).
- **Risk:** Performance regression from larger JSON.  
  _Mitigation:_ Keep AST canonical, avoid redundant attributes; measure before/after.
- **Risk:** Cloud agent touches domain logic accidentally.  
  _Mitigation:_ Explicitly state “no behavioural changes” and back it with fixtures.

## Open Questions

- Do we need bi-directional compatibility (ability to ingest legacy `.ast.json`)? Not today, but call it out if required.
- Should AST files be minified or pretty-printed? Current expectation is pretty-printed (`JSON.stringify(..., null, 2)`).
- Are there extension points that need to hook into the new schema (e.g., third-party printers)? Evaluate once schema stabilises.

---

**Action Items**

- [ ] Land Phase 0 schema helpers.
- [ ] Brief migration engineer (or cloud agent) using this doc.
- [ ] Execute Phases 1–3 with full test coverage and doc updates.
