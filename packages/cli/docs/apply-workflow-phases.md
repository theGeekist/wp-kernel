# Phase 05 - Apply Workflow (Next Pipeline)

_See [Docs Index](./index.md) for navigation._

**Audience:** contributors extending or refactoring the next-generation CLI apply flow (`packages/cli/src/next/**`).

**Goal:** keep `apply` deterministic and safe while we transition from in-place controller merges to a model where generated artefacts live in `.generated/**` and user code merely extends or decorates them. The command itself will be produced via a `buildApplyCommand` factory so it can plug into the same dependency-injection seams that other next-gen commands already expose.

> **MVP Plan reference:** Phase 5 - Apply layering & flags (Phase table entry #4)

- **Version guard:** Apply Phase 5 culminates in the **0.9.0** minor release. Reserve patch slots 0.8.1 (shim implementation), 0.8.2 (flag/log plumbing), 0.8.3 (integration coverage), and keep 0.8.4 as a buffer immediately before 0.9.0.
- **Pipeline rules:** Helpers remain AST-first-no string-based generation-and only `createHelper`-derived helpers may use the `create*` prefix. Alias other `create*` imports locally.
- **Release checks:** Before cutting 0.9.0 run `pnpm --filter @wpkernel/cli test`, `pnpm --filter @wpkernel/core test`, `pnpm --filter @wpkernel/php-driver test`, `pnpm --filter @wpkernel/ui test`, `pnpm typecheck`, and an end-to-end `wpk generate && wpk apply --yes --dry-run` against the showcase workspace. Record the commands and results in the release PR.

---

## 1. Current state (next/\*)

### 1.1 Patch generation

- The next pipeline builds apply plans under `.wpk/apply/plan.json` and manifests under `.wpk/apply/manifest.json` via `createPatcher` (`packages/cli/src/next/builders/patcher.ts:1-210`). Each instruction describes a three-way merge between:
    - the _base_ snapshot that shipped with the plan,
    - the _current_ workspace file,
    - the _incoming_ file emitted by the generators.
- `git merge-file --diff3` performs the merge in a sandbox temp directory; conflicts surface as `PatchRecord { status: 'conflict' }`.

### 1.2 CLI surface

- `buildApplyCommand` (`packages/cli/src/next/commands/apply.ts`) produces the default `NextApplyCommand`, which loads the plan, runs the patcher helper, prints the manifest summary, and exits with `WPK_EXIT_CODES.VALIDATION_ERROR` if any conflicts remain.
- The factory wrapper (`buildApplyCommand`) now exposes the dependency-injection seam used by `buildGenerateCommand` and `buildInitCommand`, returning `NextApplyCommand` while we continue layering safety rails.
- Flags like `--yes`, `--backup`, and `--force` are not yet honoured; support will be ported into the command as part of the layering work.

### 1.3 Legacy reference point

- The legacy command still handles every side effect: it copies generated PHP into `inc/`, syncs block artefacts, respects `--yes/--backup/--force`, keeps an append-only `.wpk-apply.log`, and emits summaries for PHP and blocks (`packages/cli/src/commands/apply/command.ts:21-157`).
- Guard rails rely on git: the preflight check shells out to `git status --porcelain -- .generated/php` and warns instead of failing when the directory is not tracked (`packages/cli/src/commands/apply/ensure-generated-php-clean.ts:11-99`). This behaviour needs to tighten when we require a repository for apply.

### 1.4 Gaps in the next command

- The next apply path only reads `.wpk/apply/plan.json` and writes `.wpk/apply/manifest.json`; it never stages or mutates user code directly, so composer autoload discovery and shim creation are still missing (`packages/cli/src/next/commands/apply.ts:145-212`).
- `createPatcher` performs diff3 merges in temporary files but depends entirely on pre-authored instructions. The helper currently skips work if no plan exists, and no builder emits that plan yet (`packages/cli/src/next/builders/patcher.ts:226-318`).
- There is no git guardrail: if the workspace lacks a `.git` directory the command still runs because neither the command nor the helper asserts repository state (`packages/cli/src/next/commands/apply.ts:145-212`).
- The manifest is printed to stdout, but we do not append to `.wpk-apply.log` or snapshot the builder actions that would let the CLI review pending writes before they hit disk (`packages/cli/src/next/commands/apply.ts:183-212`).

### 1.5 Safety guarantees

- Merges occur in a sandbox; `queueWrite` only records filesystem actions after the helper commits (`packages/cli/src/next/builders/patcher.ts:226-318`).
- Exit codes map to the core contract (`@wpkernel/core/contracts`), so commands remain scriptable (`packages/cli/src/next/commands/apply.ts:145-212`).

---

## 2. Desired behaviour

### 2.1 Deterministic layering

We want generated PHP (and future artefacts) to be the canonical implementation:

1. **Generated base** - `.generated/php/Rest/FooController.php` contains the full class produced from the IR.
2. **User surface** - the project’s `inc/Rest/FooController.php` simply extends that base:

```php
require_once __DIR__ . '/../../.generated/php/Rest/FooController.php';

class FooController extends \Vendor\Plugin\Generated\Rest\FooController {
	// user hooks and overrides
}
```

3. **Apply task** - `apply` ensures the extension shim points at the latest generated class and rewrites only the bits that wire the user layer to the fresh base.

### 2.2 Why keep the merge engine?

The three-way merge machinery remains valuable:

- Still catches conflicts when the extension shim diverges from the expected template.
- Continues to provide atomic updates and diff3 context.
- Lets us stage changes safely inside `.wpk/apply/**` before touching the workspace.

What changes is _what_ we merge. Instead of large controller bodies, the merge inputs become small, predictable shims (think: the `require_once` + class signature). That dramatically lowers conflict surface and keeps user edits isolated to override methods.

---

## 3. Implementation plan

1. **Adopt the command factory seam**
    - Keep `buildApplyCommand` in the next command surface so tests and the orchestrator can construct the command with injected reporters, workspace handles, or builders.
    - Mirror the dependency injection options already offered by `buildGenerateCommand` and expose overrides for the patcher helper and manifest reader.
2. **Ensure generated classes are consumable as bases**
    - Confirm every generated controller/helper exposes a stable namespace and class name that user code can extend (`packages/cli/src/next/builders/php/resourceController.ts:1-870`, `indexFile.ts:1-74`, `policy.ts:21-110`).
    - Guarantee `.generated/**` remains the single source of truth (already true for PHP/AST output, see `packages/cli/src/next/builders/php/writer.ts:30-68`).
3. **Introduce extension shims**
    - Create or update the apply plan builder to emit files that wrap generated classes (e.g., require + subclass).
    - Treat those shims as templates we own; the user keeps overrides inside the class body.
    - Detect whether `composer.json` exposes a PSR-4 namespace (the init template wires `inc/` automatically, see `packages/cli/templates/init/composer.json:1-9`) and fall back to emitting `require_once` guards when autoloading is unavailable.
    - Warn during generation when the configured namespace cannot be normalised to PSR-1 before writing shims so projects know to adjust `kernel.config.ts`.
4. **Port safety rails**
    - Carry across flag handling (`--yes`, `--backup`, `--force`) and `.wpk-apply.log` once the new layering is in place.
    - Enforce git hygiene: fail early when `.git` is missing or dirty instead of silently skipping checks as the legacy helper does today (`packages/cli/src/commands/apply/ensure-generated-php-clean.ts:11-99`).
    - Mirror the legacy logging contract by appending structured entries to `.wpk-apply.log` on success and failure (`packages/cli/src/commands/apply/command.ts:104-140`).
5. **Update tests**
    - Extend `packages/cli/src/next/builders/__tests__/patcher.test.ts` (or add new suites) to assert the shim model.
    - Add integration tests that regenerate `.generated/**`, run `apply`, and confirm user shims update without touching custom overrides.

---

## 4. Open questions

- How do we detect when a user intentionally diverges from the shim template? Options include checksum headers or storing the last-applied version in comments.
- Should the shim emit abstract methods or protected hooks to encourage extension rather than override?
- How do we surface conflicts when the generated class signature changes (e.g., renamed methods)? The diff3 output is still available, but we may want higher-level diagnostics.

---

## 5. References

- Next patcher helper: `packages/cli/src/next/builders/patcher.ts`
- Next apply command: `packages/cli/src/next/commands/apply.ts`
- Legacy apply command (reference only): `packages/cli/src/commands/apply/command.ts`
- Next PHP writer (AST + pretty printer): `packages/cli/src/next/builders/php/writer.ts`
- Generate pipeline entrypoint: `packages/cli/src/next/ir/createIr.ts`

Use this document as the single source of truth for Apply Phase 05 status. Update it whenever new milestones land so contributors work from current guidance only.
