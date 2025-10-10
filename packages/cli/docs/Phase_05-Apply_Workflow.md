# Phase 05 Cohort – Apply Workflow & PHP Emitters

_Purpose_: Break the large Phase 5/5a scope into three incremental, testable phases so the cloud agents can land each piece without overload.

---

## Phase 05A – Guarded PHP Apply Command

**Spec references:** [`the-cli-idea.md` §6 – `wpk apply`](../the-cli-idea.md#6-commands)

**Goal**: Deliver a minimal `wpk apply` that can copy `.generated/php/**` into `inc/` while respecting `WPK:BEGIN/END AUTO` sections and preserving manual edits outside the guard rails.

### Scope

- Copy generated PHP files into the project `inc/` directory (create directories as needed).
- For files containing guarded blocks, replace only the `WPK:BEGIN AUTO … WPK:END AUTO` segment; preserve everything else.
- Reject destination files missing guard markers when the generated file contains them.
- Skip copying for files without changes.
- CLI output summarises `created/updated/skipped` counts.

### Deliverables

- `src/commands/apply.ts` with merge logic + smoke tests.
- Fixture-based tests covering: new file creation, guarded merges, missing markers, no-op runs.
- Status log entry in `PHASES.md`.

### Definition of Done

- `pnpm --filter @geekist/wp-kernel-cli test` and lint/typecheck suite pass.
- Applying on the sample workspace doesn’t disturb manual scaffolding outside AUTO blocks.

---

## Phase 05B – Apply Safety & Logging

**Spec references:** [`the-cli-idea.md` §6 – `wpk apply`](../the-cli-idea.md#6-commands)

**Goal**: Harden the apply command with safety rails and audit logging.

### Scope

- Enforce clean `.generated/php/**` (or provide `--yes` to override).
- Provide `--backup` option that writes a `*.bak` before overwriting.
- Allow `--force` to overwrite guarded sections when manual edits are detected.
- Emit `.wpk-apply.log` summarising actions, timestamps, and flags used.
- Exit codes:
    - `0` success
    - `1` validation / guard failure
    - `2` unexpected I/O failure

### Deliverables

- Updated `apply.ts` with flag parsing, log writer, safety checks.
- Tests covering dirty state rejection, backup creation, force behaviour, log content.
- Status log update.

### Definition of Done

- All CLI tests + typecheck/lint pass.
- `.wpk-apply.log` matches snapshot in fixtures.

---

## Phase 05C – PHP Printer DX Upgrade

**Spec references:** [`the-cli-idea.md` §5 – Printers & Emitters](../the-cli-idea.md#5-printers--emitters)

**Goal**: Replace raw `json_decode('...')` strings with native PHP array builders for REST args and persistence registry.

### Scope

- Update printers to render arrays with proper indentation, guard markers unchanged.
- Ensure arrays preserve metadata (identity, required flags, schema hash references).
- Update fixtures and documentation to reflect the improved output.
- Document the recipe for adapters to extend these arrays after the change.

### Deliverables

- Printer refactor with helper functions + unit tests.
- Updated integration snapshots for `.generated/php/**` in the showcase.
- Documentation updates describing the new structure.
- Status log entry.

### Definition of Done

- Regenerated showcase assets compile (`php -l`) and match expected format.
- Coverage stays ≥ 95% line/statement for printer modules.
- CLI typecheck/lint/test suite green.

---

## Shared Expectations

- Align deliverables with the guiding sections in `the-cli-idea.md` (linked above) and cross-reference this document when updating `packages/cli/PHASES.md`.
- Each phase must finish with `pnpm typecheck`, `pnpm typecheck:tests`, `pnpm lint --fix`, `pnpm format`, and `pnpm --filter @geekist/wp-kernel-cli test` passing.
- Keep commits scoped to the active sub-phase (A/B/C).
