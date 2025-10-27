# Command Migration & Parity Plan

_See [Docs Index](./index.md) for navigation._

**Audience:** maintainers migrating CLI commands to the next pipeline (`packages/cli/src/next/**`).

**Goal:** retire the legacy command shims by rebuilding every entry point on top of the helper-first pipeline and the shared `@wpkernel/core/pipeline` orchestration helpers.

This plan supplements the focused workflow guides (for example [Apply Workflow Phases](./apply-workflow-phases.md)). Use it to understand how each command behaves today, the expected improvements, and how the work maps onto the [MVP Plan](./mvp-plan.md).

---

## 1. Command surface snapshot

| Command    | Next entry point                                                                                 | Legacy entry point                                   | Current behaviour                                                                               | Required upgrades                                                                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apply`    | `buildApplyCommand` (`src/next/commands/apply.ts`) returning `NextApplyCommand`                  | `ApplyCommand` (`src/commands/apply/command.ts`)     | Native manifest reader with partial parity (no git, logging, or composer/autoload integration). | Port flag/log behaviour, enforce git, append `.wpk-apply.log`, emit shims when composer autoload is unavailable, and refactor through a `buildApplyCommand` factory. |
| `generate` | `buildGenerateCommand` (`src/next/commands/generate.ts`) delegating to the legacy implementation | `GenerateCommand` (`src/commands/generate/index.ts`) | Delegates entirely to the legacy command.                                                       | Compose a native helper-driven command (`createPipeline`, diagnostics) and retire the delegation bridge.                                                             |
| `init`     | `buildInitCommand` (`src/next/commands/init.ts`)                                                 | `InitCommand` (`src/commands/init.ts`)               | Bridges to the legacy scaffolder.                                                               | Implement git repository warnings, align prompts with next pipeline adapters, and prepare for `create` reuse.                                                        |
| `create`   | -                                                                                                | -                                                    | Not implemented.                                                                                | Wrap the init flow, bootstrap git when missing, install npm + composer dependencies, and surface progress via the next reporter.                                     |
| `start`    | `buildStartCommand` (`src/next/commands/start.ts`)                                               | `StartCommand` (`src/commands/start.ts`)             | Delegates to the legacy watcher.                                                                | Rebuild as a native pipeline orchestration (watch IR, regenerate, optionally `apply`) with chokidar tiers and Vite integration.                                      |
| `doctor`   | `buildDoctorCommand` (`src/next/commands/doctor.ts`)                                             | `DoctorCommand` (`src/commands/doctor.ts`)           | Stub that returns success.                                                                      | Implement health checks (config schema, composer autoload, php-driver availability, workspace hygiene) and report via the next reporter.                             |
| `build`    | -                                                                                                | `BuildCommand` (`src/commands/build.ts`)             | Deprecated.                                                                                     | No replacement planned; document removal.                                                                                                                            |

All next-gen commands should follow the `build*Command` factory pattern already used by `generate`, `init`, `start`, and `doctor`. The factories encapsulate dependency injection for tests, provide a seam for sharing the clipanion command metadata, and will make it possible to run commands inside the core pipeline orchestrator.

---

## 2. Pipeline orchestration expectations

The legacy CLI wired command lifecycles manually. The next pipeline should:

1. Construct commands through dedicated factories (e.g. `buildApplyCommand`) that accept optional overrides for loaders, reporters, and builders so integration tests can stub the filesystem and IR.
2. Route command execution through `@wpkernel/core/pipeline` primitives rather than bespoke control flow. Reuse the existing helper adapters (`createPipeline`, `createHelper`, workspace transactions) so commands execute deterministic phases with consistent logging.
3. Share command environment helpers via `commands/next/internal/delegate.ts` (already in use by `generate`), extending them where needed to cover workspace prompts, git assertions, and dependency installers.

Embedding the commands in factories keeps the orchestration consistent with the next pipeline and lets the CLI participate in the broader core/pipeline execution model when orchestration is delegated from other packages.

---

## 3. Command scopes

### 3.1 Apply

- **Current state:** The default `NextApplyCommand` produced by `buildApplyCommand` loads the kernel config, executes `createPatcher`, and prints the manifest summary. It does not enforce git hygiene, create backups, honour `--yes/--backup/--force`, or append to `.wpk-apply.log`.
- **Legacy reference:** `packages/cli/src/commands/apply/command.ts` handles three-way merges, composer autoload detection, shim creation, git checks, backups, and logging.
- **Scope:**
    - Introduce `buildApplyCommand` that mirrors the structure of `buildGenerateCommand` so tests can instantiate the command with injected builders/reporters.
    - Update the apply workflow to emit user extension shims and compute `require_once` fallbacks when composer autoload is absent. See [Apply Workflow Phases](./apply-workflow-phases.md) for the layering plan.
    - Port git requirements (fail when `.git` is missing), restore `--yes/--backup/--force` semantics, and persist `.wpk-apply.log` entries.
    - Ensure manifests capture builder actions so the pipeline can reconcile pending writes before touching the workspace.
- **MVP Plan mapping:** Tasks in [Phase 5 - Apply layering & flags](./mvp-plan.md#phase-5---apply-layering--flags--planned-) cover shim generation, safety rails, and release gating. The new `buildApplyCommand` factory lands in Phase 4 Task 20.

### 3.2 Generate

- **Current state:** `buildGenerateCommand` immediately imports the legacy implementation and delegates execution.
- **Scope:**
    - Implement a native command that composes `createPipeline`, runs diagnostics (`validateGeneratedImports`, IR warnings), and writes artefacts via the next workspace transaction.
    - Preserve `--dry-run` and `--verbose` options with richer reporter output.
    - Maintain compatibility with adapters/extensions that hook into the generate phase.
- **MVP Plan mapping:** Phase 4 Task 22 in the [MVP Plan](./mvp-plan.md#phase-4---command-migration--string-printer-retirement--planned-) tracks this migration and unblocks the removal of the legacy string printers.

### 3.3 Init

- **Current state:** `buildInitCommand` now scaffolds via next workspace helpers, prints manifest summaries, and warns when no git repository is detected.
- **Scope:**
    - Continue evolving prompts and reporter messaging alongside future workflow polish.
    - Share helpers with the `create` wrapper so dependency installation and git bootstrap remain consistent.
- **MVP Plan mapping:** Phase 4 Task 21 covers native init scaffolding and the shared surface needed by `create`.

### 3.4 Create

- **Current state:** `buildCreateCommand` wraps the init workflow, initialises git repositories when missing, and installs npm/composer dependencies with a `--skip-install` escape hatch.
- **Scope:**
    - Expand logging/reporting as additional workflow polish lands and ensure idempotent reruns remain covered by integration tests.
- **MVP Plan mapping:** Phase 4 Task 21 includes delivering the create wrapper alongside the init rewrite.

### 3.5 Start

- **Current state:** `buildStartCommand` delegates to the legacy watcher.
- **Scope:**
    - Build a helper-driven watcher that listens for config/schema changes, regenerates artefacts, and optionally invokes `apply`.
    - Tier chokidar watchers so large projects can limit hot reloading scopes.
    - Integrate with the Vite dev server used in examples and surface diagnostics through the reporter.
- **MVP Plan mapping:** Phase 4 Task 23 covers the new watcher orchestration and its integration tests.

### 3.6 Doctor

- **Current state:** `buildDoctorCommand` is a stub that returns success immediately.
- **Scope:**
    - Run config schema validation, composer autoload inspections, php-driver availability checks, and workspace hygiene audits.
    - Produce actionable output (including exit codes) that users can script in CI.
    - Share helper utilities with apply/start where possible (git assertions, dependency detection).
- **MVP Plan mapping:** Phase 4 Task 23 includes doctor coverage to ensure the watcher and health checks align.

### 3.7 Build (deprecated)

- **State:** The legacy build command remains deprecated. The next CLI will not ship a replacement-document this in release notes and onboarding guides once the command migration completes.
- **Action:** Remove the command entry point after all other commands run natively and the documentation update lands (tracked in Phase 4 Task 24).

---

## 4. Dependencies & sequencing

1. **Phase 4 (Command migration & string-printer retirement):** Deliver the command factories (`buildApplyCommand`, native `init/create`, `generate`, `start`, `doctor`) before removing string printers. This phase culminates in the **0.8.0** release once the legacy command layer disappears.
2. **Phase 5 (Apply layering & flags):** Builds on Phase 4 by adding shim generation, git enforcement, and logging to `apply`. See the dedicated [apply workflow](./apply-workflow-phases.md) for the release guard (0.9.0 minor).
3. **Pipeline reliance:** Every command will run atop `createPipeline` and workspace transactions. Coordinate with `@wpkernel/core` to expose any missing orchestration helpers before landing command rewrites.

Keep this plan synchronised with the [CLI Migration Phases](./cli-migration-phases.md) and update entries whenever new tasks ship.
