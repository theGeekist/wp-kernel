# Command Migration & Parity Plan

_See [Docs Index](./index.md) for navigation._

**Audience:** maintainers migrating CLI commands to the next pipeline (`packages/cli/src/**`).

**Goal:** retire the legacy command shims by rebuilding every entry point on top of the helper-first pipeline and the shared `@wpkernel/core/pipeline` orchestration helpers.

This plan supplements the focused workflow guides (for example [Apply Workflow Phases](./apply-workflow-phases.md)). Use it to understand how each command behaves today, the expected improvements, and how the work maps onto the [MVP Plan](./mvp-plan.md).

---

## 1. Command surface snapshot

| Command    | Next entry point                                                       | Legacy entry point                  | Current behaviour                                                                                                | Follow-ups                                                                                                                                                                                                          |
| ---------- | ---------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apply`    | `buildApplyCommand` (`src/commands/apply.ts`) returning `ApplyCommand` | Removed in v0.8.0 (string printers) | Native manifest reader with shims, composer fallbacks, git enforcement, `.wpk-apply.log`, and flag parity.       | Phase 8 Task 46 captures future diagnostics polish; otherwise the command is feature-complete.                                                                                                                      |
| `generate` | `buildGenerateCommand` (`src/commands/generate.ts`)                    | Removed in v0.8.0 (Clipanion shim)  | Native pipeline command that runs `createPipeline`, validates adapters, and streams workspace summaries.         | Continue surfacing diagnostics/reporting improvements alongside new adapters and IR hooks.                                                                                                                          |
| `init`     | `buildInitCommand` (`src/commands/init.ts`)                            | Removed in v0.8.0 (scaffolder shim) | Native scaffolder backed by workspace helpers with git hygiene warnings and manifest summaries.                  | Share future prompt/reporting polish with `create`; no outstanding parity gaps remain.                                                                                                                              |
| `create`   | `buildCreateCommand` (`src/commands/create.ts`)                        | Removed in v0.8.0 (scaffolder shim) | Wraps the init workflow, bootstraps git when missing, installs npm/composer deps, and respects `--skip-install`. | Phase 7 Tasks 37-38 add the published bootstrap workspace and proxy; later tasks grow templates/reporting.                                                                                                          |
| `start`    | `buildStartCommand` (`src/commands/start.ts`)                          | Removed in v0.8.0 (watcher shim)    | Native watcher orchestrating chokidar tiers, regeneration, optional auto-apply, and Vite.                        | Phase 8 Task 46 leads the Vite reporter swap to `createReporter({ namespace: 'cli.vite', channel: 'console' })`; follow-up roadmap items can iterate on watcher ergonomics (selective regeneration, adapter hooks). |
| `doctor`   | `buildDoctorCommand` (`src/commands/doctor.ts`)                        | Removed in v0.8.0 (stub command)    | Runs config/composer/workspace/PHP-driver checks with structured reporter output and exit codes.                 | Add new audits as helpers land (dependency drift, git status)-no legacy parity gaps remain.                                                                                                                         |
| `build`    | -                                                                      | Removed in v0.8.0 (deprecated)      | Deprecated.                                                                                                      | No replacement planned; document removal.                                                                                                                                                                           |

All commands follow the `build*Command` factory pattern already used by `generate`, `init`, `create`, `start`, and `doctor`. The factories encapsulate dependency injection for tests, provide a seam for sharing the Clipanion command metadata, and make it possible to run commands inside the core pipeline orchestrator.

## 2. Pipeline orchestration expectations

The legacy CLI wired command lifecycles manually. The next pipeline should:

1. Construct commands through dedicated factories (e.g. `buildApplyCommand`) that accept optional overrides for loaders, reporters, and builders so integration tests can stub the filesystem and IR.
2. Route command execution through `@wpkernel/core/pipeline` primitives rather than bespoke control flow. Reuse the existing helper adapters (`createPipeline`, `createHelper`, workspace transactions) so commands execute deterministic phases with consistent logging.
3. Share command environment helpers via `commands/internal/delegate.ts` (already in use by `generate`), extending them where needed to cover workspace prompts, git assertions, and dependency installers.

Embedding the commands in factories keeps the orchestration consistent with the next pipeline and lets the CLI participate in the broader core/pipeline execution model when orchestration is delegated from other packages.

---

## 3. Command scopes

### 3.1 Apply

- **Current state:** The default `ApplyCommand` produced by `buildApplyCommand` loads the kernel config, executes `createPatcher`, honours `--yes/--backup/--force`, enforces git hygiene, and appends structured entries to `.wpk-apply.log` while printing the manifest summary.
- **Legacy reference:** The pre-0.8.0 command shim handled three-way merges, composer autoload detection, shim creation, git checks, backups, and logging; refer to the v0.7.x history for implementation details.
- **Ongoing focus:**
    - Keep shim templates and composer fallbacks aligned with adapter/runtime changes (see [Apply Workflow Phases](./apply-workflow-phases.md)).
    - Expand diagnostics/log output as Phase 8 Task 46 introduces new reporting requirements.
- **MVP Plan mapping:** Phase 4 Task 20 delivered the factory and Phase 5 closed layering + safety rails. Any additional polish now rolls into Phase 7 Tasks 37-45 (bootstrap flow) with diagnostics routed to Phase 8 Task 46.

### 3.2 Generate

- **Current state:** `buildGenerateCommand` runs the native pipeline directly, wrapping workspace transactions, adapter extensions, and reporter-driven summaries.
- **Scope:**
    - Continue surfacing diagnostics (including adapter results) through the reporter and CLI summaries.
    - Preserve `--dry-run` and `--verbose` options while keeping summary output stable for downstream tooling.
    - Maintain compatibility with adapters/extensions that hook into the generate phase.

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

- **Current state:** `buildStartCommand` orchestrates chokidar tiers, forwards reporter output, runs Vite, and optionally mirrors PHP artefacts into `inc/`.
- **Scope:**
    - Hand the Vite reporter swap to Phase 8 Task 46 (`createReporter({ namespace: 'cli.vite', channel: 'console' })`), then expand watcher ergonomics as new pipeline hooks land (e.g., scoped regeneration flags, PHP filtering).
    - Share diagnostics helpers with future apply/watch polish.
    - Coordinate Vite lifecycle tweaks with example apps as they evolve.
- **MVP Plan mapping:** Phase 4 Task 23 covers the new watcher orchestration and its integration tests.

### 3.6 Doctor

- **Current state:** `buildDoctorCommand` validates configs, composer autoload mapping, generated PHP cleanliness, and PHP runtime/driver availability.
- **Scope:**
    - Layer in additional workspace audits (git status, dependency drift) as new helpers land.
    - Ensure CI scripting remains stable by documenting exit-code contracts alongside new checks.
    - Share helper utilities with apply/start where possible (git assertions, dependency detection).
- **MVP Plan mapping:** Phase 4 Task 23 includes doctor coverage to ensure the watcher and health checks align.

### 3.7 Build (deprecated)

- **State:** The legacy build command remains deprecated. The next CLI will not ship a replacement-document this in release notes and onboarding guides once the command migration completes.
- **Action:** Remove the command entry point after all other commands run natively and the documentation update lands (tracked in Phase 4 Task 26).

---

## 4. Dependencies & sequencing

1. **Phase 4 (Command migration & string-printer retirement):** Shipped in **0.8.0** with the factories (`buildApplyCommand`, native `init/create`, `generate`, `start`, `doctor`) and the removal of legacy shims. Treat it as the baseline when adding new commands.
2. **Phase 5 (Apply layering & flags):** Closed in **0.9.0** after layering shims, git enforcement, and logging onto `apply`. See the dedicated [apply workflow](./apply-workflow-phases.md) for historical guardrails.
3. **Phase 6 (Core pipeline alignment):** Tracks Tasks 32-36 in `packages/core/docs/phase-6-core-pipeline.md.md`. Coordinate with core as the spec evolves and route CLI bootstrap follow-ups into Phase 7 Tasks 37-45.
4. **Pipeline reliance:** Every command runs atop `createPipeline` and workspace transactions. Coordinate with `@wpkernel/core` to expose any missing orchestration helpers before landing new features.

Keep this plan synchronised with the [CLI Migration Phases](./cli-migration-phases.md) and update entries whenever new tasks ship.
