# Phase 9 – DX Pipeline Integration

> Internal work log for the CLI DX readiness layer. This page tracks discovery notes, helper ownership, and integration progress as the DX orchestration layer comes together under `packages/cli/src/dx/*`.

## Cadence

Phase 9 runs in the 0.12.x band and keeps the `@wpkernel/pipeline` contract untouched. All orchestration work happens inside the CLI package by extending the runtime configured in [`packages/cli/src/runtime/createPipeline.ts`](../packages/cli/src/runtime/createPipeline.ts).

## Task ledger

| Task | Scope               | Status      | Notes                                                                                         |
| ---- | ------------------- | ----------- | --------------------------------------------------------------------------------------------- |
| 53   | Discovery & mapping | ✅ Complete | Consolidated command/runtime surfaces and readiness unit inventory.                           |
| 54   | DXIRv1 foundation   | ✅ Complete | DX context + readiness registry landed with helpers for git, composer, PHP, tsx, and hygiene. |
| 55   | Command integration | ⬜ Planned  | Route create/init/doctor/generate/apply through DXIRv1 without regressing workflows.          |
| 56   | Reporter & logging  | ⬜ Planned  | Align DX events with existing LogLayer transports and error surfaces.                         |
| 57   | Validation sweep    | ⬜ Planned  | Exercise the packed CLI (`pnpm pack`) in a temp workspace to confirm readiness idempotency.   |

## Discovery baseline (Task 53)

_This section documents the confirmed surfaces that DXIRv1 will reuse. Updates reflect hands-on inspection rather than assumptions._

### Command entry points

- `wpk create` composes workspace setup, git detection, dependency installers, and init workflow orchestration inside [`packages/cli/src/commands/create.ts`](../packages/cli/src/commands/create.ts). The command already threads dependency hooks for git, npm, and composer installers, which DXIRv1 can wrap instead of rewriting.
- `wpk init` shares its runtime builder with create via [`packages/cli/src/commands/init/command-runtime.ts`](../packages/cli/src/commands/init/command-runtime.ts), exposing a single seam (`createInitCommandRuntime`) that resolves reporters, workspace roots, and workflow options before invoking the init pipeline.
- `wpk doctor` currently executes configuration, composer, workspace hygiene, and PHP environment checks inline inside [`packages/cli/src/commands/doctor.ts`](../packages/cli/src/commands/doctor.ts). Each check produces a `DoctorCheckResult`, which DXIRv1 should emit through the same reporter hierarchy for consistent summaries.
- Config resolution (`loadWPKernelConfig`) already returns both the config payload and source path, enabling DXIRv1 detect phases to derive workspace context without re-parsing configuration files.

### Workspace & installer utilities

- Workspace hygiene helpers (`ensureCleanDirectory`, `ensureGeneratedPhpClean`) encapsulate git status probes and error formatting in [`packages/cli/src/workspace/utilities.ts`](../packages/cli/src/workspace/utilities.ts). They should become readiness units rather than remaining ad-hoc calls.
- Git status and initialisation logic (`isGitRepository`, `initialiseGitRepository`) live in [`packages/cli/src/commands/init/git.ts`](../packages/cli/src/commands/init/git.ts); they depend on `execFile` and surface `WPKernelError` metadata, making them safe to wrap in detect/prepare steps.
- Installer wrappers for npm and composer shell out via `execFile` in [`packages/cli/src/commands/init/installers.ts`](../packages/cli/src/commands/init/installers.ts). DXIRv1 needs to provide detection (lockfile/package-manager choice) ahead of these installers and capture stderr when retries are required.
- PHP environment checks in `doctor` call `execFile` directly to inspect binaries. This behaviour must be lifted into a helper so `generate` and `apply` can reuse the confirm step before launching PHP-based printers.

### Reporter stack

- CLI commands standardise on `createReporterCLI`, which binds LogLayer transports (pretty terminal + hooks) in [`packages/cli/src/utils/reporter.ts`](../packages/cli/src/utils/reporter.ts). DXIRv1 should build child reporters from this helper so detect/prepare/execute/confirm messages inherit the same namespace and metadata expectations.
- Existing reporter children (`reporter.child('composer')`, etc.) in `doctor` provide precedents for nested DX sections. Mirroring that shape will keep console summaries and hook payloads compatible with current consumers.

### Pipeline contract reuse

- The CLI runtime wraps `@wpkernel/pipeline` through [`packages/cli/src/runtime/createPipeline.ts`](../packages/cli/src/runtime/createPipeline.ts). DXIRv1 should follow the same pattern: extend context at the call site and let helpers participate through extension hooks instead of changing shared pipeline types.
- Helpers can piggyback on the existing extension commit/rollback semantics surfaced by the runtime. No new transaction layer is required—only well-scoped readiness helpers that register their side effects.

## Package manager and lockfile behaviour (Task 53)

Existing installers always run `npm install` and `composer install` directly; there is no package-manager detection, lockfile preference, or lazy dependency planner today. DXIRv1 must add a detect phase that:

1. Identifies the active Node package manager and lockfile strategy.
2. Skips redundant installs when lockfiles already reflect the requested dependencies.
3. Records how readiness execution installs lazy assets (for example, `tsx`) so replays remain idempotent.

Any additional hooks (e.g., pnpm support) should be noted here as they are discovered.

## Readiness unit inventory (Task 53)

| Readiness unit      | Current location                                 | Behaviour today                                                                                    | Gaps / brittleness                                                          | Proposed DXIRv1 owner                                                         |
| ------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `php-runtime`       | Doctor command (PHP checks inline)               | Invokes PHP binaries via `execFile` and reports pass/warn/fail directly.                           | Hard-coded command wiring; no reuse by create/init/generate.                | Dedicated helper under `dx/readiness/phpRuntime`.                             |
| `composer`          | Doctor + init installers                         | Composer install only runs during create/init; doctor just confirms autoload presence.             | No detection/skip logic; failing installs throw generic `DeveloperError`.   | Helper that detects composer availability and installs autoload when missing. |
| `php-driver`        | Doctor (composer autoload) & runtime assumptions | Relies on `@wpkernel/php-driver` being present in node_modules/vendor without packaging awareness. | Published CLI missed PHP driver assets; no detection before generate/apply. | Helper that validates bundled assets and backfills via composer if missing.   |
| `tsx-runtime`       | Implicit expectation in CLI runtime              | No installer; commands assume `tsx` is in devDependencies.                                         | Scaffolded projects fail immediately because tsx is absent.                 | Helper that installs or prompts for tsx during prepare/execute.               |
| `git`               | Workspace utilities                              | `ensureCleanDirectory` and `isGitRepository` throw WPKernel errors on failure.                     | Checks run in different places, no central reporting or confirm step.       | Helper that consolidates git detection and repository initialisation.         |
| `workspace-hygiene` | Workspace utilities + doctor                     | Cleanliness checks exist but are triggered ad-hoc.                                                 | Duplicate logging formats and inconsistent skip flags (`--yes`).            | Helper that standardises detection and confirm messaging.                     |

## Published artifact validation

All downstream integration and validation tasks must exercise the packed CLI (`pnpm pack` + local install) inside a fresh temp workspace. This prevents the source-tree bias that hid missing PHP driver assets in earlier integration runs.

## Task 54 – DXIRv1 foundation (complete)

- Added a dedicated DX context (`packages/cli/src/dx/context.ts`) that threads cwd, workspace roots, and `WPK_CLI_FORCE_SOURCE` into readiness helpers.
- Introduced the readiness helper factory and registry (`packages/cli/src/dx/readiness/*`), enabling detect → prepare → execute → confirm orchestration with rollback/cleanup handling.
- Wrapped existing git, composer, PHP runtime/driver, tsx runtime, and workspace hygiene logic into deterministic helpers under `packages/cli/src/dx/readiness/helpers/`.
- Landed Jest coverage for the registry planner and each helper to lock in dependency injection seams ahead of command integration.

## Task 55 – Command integration

- Inject DXIRv1 into `create` and `init` by extending `createInitCommandRuntime` so readiness detection runs before workspace workflows. Preserve existing CLI options (`--skip-install`, `--yes`) by mapping them onto helper configuration.
- Register the default readiness helpers (`packages/cli/src/dx/readiness/helpers`) with a shared registry instance and plumb helper options from command arguments.
- Wrap `doctor` checks with the readiness helpers to guarantee console summaries and exit codes remain unchanged while delegating work to DXIRv1.
- Add an integration seam inside `generate`/`apply` to invoke readiness units on demand when missing prerequisites (php-driver assets, tsx runtime) are detected.
- Refresh unit/integration tests to cover the new orchestration flow, including scenarios where DXIRv1 exits early or retries installers; reuse the new helper tests as fixtures.

## Task 56 – Reporter & logging alignment

- Emit detect/prepare/execute/confirm phases through `createReporterCLI` child reporters, ensuring LogLayer transports and hook payloads match existing consumers.
- Provide concise status updates (start, success, warning, failure) per readiness unit without dumping raw diagnostic objects. Reuse existing formatting helpers where available.
- Document the new reporter channels/events in this file so future tasks can reference the canonical surface.

## Task 57 – Validation sweep

- Use `pnpm pack` to build the CLI tarball, install it into a temporary directory, and run `npx @wpkernel/wpk` end-to-end to confirm readiness orchestration before `generate` executes.
- Re-run the workflow in the same temp workspace to assert idempotency (detect should short-circuit; confirm should report clean state).
- Capture any residual gaps (missing helpers, installer edge cases, packaging issues) in the documentation along with recommended follow-up tasks or IRv1 extensions.
