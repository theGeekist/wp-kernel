# Monorepo Unit Test Audit & Consolidated Plan

## Shared Helper Landscape (2024-10)

- WordPress globals flow across packages via `tests/test-utils/wp.test-support.ts` and `packages/core/tests/wp-environment.test-support.ts`, while the UI harness imports the core helper through a relative path, proving the contract is stable yet missing a published entry point.【F:tests/test-utils/wp.test-support.ts†L1-L140】【F:packages/core/tests/wp-environment.test-support.ts†L1-L209】【F:packages/ui/tests/ui-harness.test-support.ts†L10-L129】
- CLI suites depend on an internal trio for command contexts, disposable workspaces, and reporter mocks; they form a coherent surface but remain siloed in `@wpkernel/cli` even though other packages recreate similar patterns when they need streams or reporters.【F:packages/cli/tests/cli-command.test-support.ts†L1-L62】【F:packages/cli/tests/workspace.test-support.ts†L13-L90】【F:packages/cli/tests/reporter.test-support.ts†L25-L41】
- Integration and e2e workflows lean on `@wpkernel/e2e-utils` primitives for spawning commands, managing file manifests, and snapshotting transient workspaces; these helpers already expose declarative APIs but overlap with the CLI workspace utilities.【F:packages/e2e-utils/src/integration/workspace.ts†L26-L105】【F:packages/e2e-utils/src/integration/fs-manifest.ts†L1-L113】【F:packages/e2e-utils/src/test-support/cli-runner.test-support.ts†L1-L24】
- Core-specific harnesses (action runtime overrides, resource factories) extend the same WordPress scaffolding and would immediately benefit from a canonical upstream module instead of repeating `globalThis` plumbing in each package.【F:packages/core/tests/action-runtime.test-support.ts†L1-L67】【F:packages/core/tests/resource.test-support.ts†L1-L210】

### Package audit passthrough

- **@wpkernel/core** – The audit underscores the WordPress harness family (`createWordPressTestHarness`, `withWordPressData`, `createApiFetchHarness`) and action/runtime overrides that coordinate cache, transport, and grouped-store suites; these are prime candidates for promotion into a shared package.【F:packages/core/UNIT_TEST_AUDIT_AND_IMPROVEMENTS.md†L7-L34】【F:packages/core/tests/wp-environment.test-support.ts†L1-L209】【F:packages/core/tests/action-runtime.test-support.ts†L1-L67】
- **@wpkernel/cli** – Command coverage hinges on the trio of CLI helpers (`assignCommandContext`, `flushAsync`, `createWorkspaceRunner`) alongside the reporter mock, matching the surfaces we plan to expose under `@wpkernel/test-utils/cli`.【F:packages/cli/UNIT_TEST_AUDIT_AND_IMPROVEMENTS.md†L9-L44】【F:packages/cli/tests/cli-command.test-support.ts†L1-L62】【F:packages/cli/tests/reporter.test-support.ts†L25-L41】
- **@wpkernel/ui** – DataView and hook suites standardise on the UI harness plus controller helpers, reinforcing that the runtime wiring should live in a publishable module rather than relative imports from `packages/core`.【F:packages/ui/UNIT_TEST_AUDIT_AND_IMPROVEMENTS.md†L5-L41】【F:packages/ui/src/dataviews/test-support/ResourceDataView.test-support.tsx†L110-L461】【F:packages/ui/tests/ui-harness.test-support.ts†L10-L129】
- **@wpkernel/e2e-utils** – The integration helpers (`createIsolatedWorkspace`, `createCliRunner`, manifest diff utilities) and the documented gaps around timeouts and env precedence align with the proposed `integration` namespace for the new package.【F:packages/e2e-utils/UNIT_TEST_AUDIT_AND_IMPROVEMENTS.md†L5-L40】【F:packages/e2e-utils/src/integration/workspace.ts†L26-L189】【F:packages/e2e-utils/src/integration/cli-runner.ts†L1-L183】

## Proposal: @wpkernel/test-utils

### Candidate helper surface

- WordPress global scaffolding (ensuring `window.wp`, namespace resets, env overrides) becomes `@wpkernel/test-utils/wp`, with core action/runtime adapters layered on top as `@wpkernel/test-utils/core` to keep lifecycle contracts centralised.【F:tests/test-utils/wp.test-support.ts†L1-L140】【F:packages/core/tests/action-runtime.test-support.ts†L1-L67】
- Node and integration primitives (temp workspaces, CLI transcripts, file manifests) graduate into `@wpkernel/test-utils/integration`, giving CLI suites and package smoke tests the same spawn/FS semantics before Playwright-specific logic takes over.【F:packages/cli/tests/workspace.test-support.ts†L13-L90】【F:packages/e2e-utils/src/integration/workspace.ts†L26-L105】【F:packages/e2e-utils/src/integration/fs-manifest.ts†L1-L113】
- Domain wrappers (CLI command contexts, UI runtime harness, reporter mocks) surface under focused entry points such as `@wpkernel/test-utils/cli` and `@wpkernel/test-utils/ui`, eliminating the cross-package relative imports we lean on today.【F:packages/cli/tests/cli-command.test-support.ts†L1-L62】【F:packages/ui/tests/ui-harness.test-support.ts†L36-L129】【F:packages/cli/tests/reporter.test-support.ts†L25-L41】

### 1. Should we move `@wpkernel/e2e-utils` integration helpers?

- Promote the agnostic layers-`workspace.ts`, `cli-runner.ts`, `fs-manifest.ts`, and their type definitions-into `@wpkernel/test-utils/integration`, then re-export them inside `@wpkernel/e2e-utils` to avoid a breaking change for existing consumers.【F:packages/e2e-utils/src/integration/workspace.ts†L26-L189】【F:packages/e2e-utils/src/integration/cli-runner.ts†L1-L183】【F:packages/e2e-utils/src/integration/fs-manifest.ts†L1-L113】【F:packages/e2e-utils/src/integration/types.ts†L1-L107】
- Keep higher-order Playwright features (`bundle-inspector.ts`, `registry.ts`, `golden.ts`, `config-fabricators.ts`) inside `@wpkernel/e2e-utils`; they carry assumptions about publishing flows and asset inspection that would bloat a general-purpose test package.【F:packages/e2e-utils/src/integration/bundle-inspector.ts†L1-L164】
- This split lets `@wpkernel/test-utils` offer deterministic Node integration primitives while `@wpkernel/e2e-utils` focuses on browser orchestration, keeping release cadence manageable.

### 2. Directory layout for integration helpers

- Prefer the `test-utils/{cli,core}/integration` shape: teams can import their domain surface (`@wpkernel/test-utils/cli`) and drill into `.integration` when needed, keeping unit and integration harnesses adjacent and discoverable.
- Expose a neutral `@wpkernel/test-utils/integration/*` namespace for cross-domain primitives (workspace, CLI runner) that power the domain-specific layers; CLI and e2e code can then re-export as needed without diverging implementations.

### 3. High-leverage deduplication targets

- Reporter mocks and runtime constructors are duplicated between CLI and UI; centralising them yields one canonical reporter fabricator for all packages.【F:packages/cli/tests/reporter.test-support.ts†L25-L41】【F:packages/ui/tests/ui-harness.test-support.ts†L36-L72】
- Temporary workspace management lives both in CLI (`withWorkspace`, `createWorkspaceRunner`) and e2e helpers (`createIsolatedWorkspace`, manifest writers); sharing an underlying workspace factory eliminates inconsistent teardown behaviour.【F:packages/cli/tests/workspace.test-support.ts†L13-L90】【F:packages/e2e-utils/src/integration/workspace.ts†L26-L189】
- WordPress harness plumbing (namespace resets, `withWordPressData`, API fetch harness) already crosses package boundaries; moving it behind `@wpkernel/test-utils/wp` prevents further relative imports and keeps namespace hygiene in sync.【F:tests/test-utils/wp.test-support.ts†L1-L140】【F:packages/core/tests/wp-environment.test-support.ts†L1-L209】
- Environment utilities such as `setProcessEnv` and global clean-up routines are re-implemented in ad-hoc suites; promoting them will reduce bespoke `beforeEach` blocks and improve coverage of negative paths that depend on shared state.【F:tests/test-utils/wp.test-support.ts†L69-L140】【F:packages/core/tests/resource.test-support.ts†L180-L210】

### 4. Should root test-utils live in the package?

- Yes. The root `tests/test-utils/wp.test-support.ts` is already the canonical entry point for WordPress globals; folding it into `@wpkernel/test-utils` preserves the existing alias while giving other packages a published, versioned dependency instead of a filesystem path.【F:tests/test-utils/wp.test-support.ts†L1-L140】

## Recommendation & Next Steps

**Next Steps**
(1) ✓ Scaffolded `packages/test-utils` with shared WordPress and workspace primitives behind domain-specific entry points and updated monorepo tooling to recognise the new package.
(2) ✓ Expanded `@wpkernel/test-utils` to host CLI, Core, and UI helper domains while maintaining temporary shims inside each package.
(3) Migrate package consumers and documentation to the shared surfaces, then retire the compatibility layers once adoption is complete.

### Step (1) implementation blueprint: Scaffold `@wpkernel/test-utils`

STATUS: **COMPLETED**

### Step (2) implementation blueprint: Expand `@wpkernel/test-utils` domains before migrating consumers

**Package surface expansion**

- Create a `packages/test-utils/src/cli/` entry point that lifts `createCommandContext`, `assignCommandContext`, the memory stream, and the reporter mock into the shared package.【F:packages/test-utils/src/cli/index.ts†L1-L3】【F:packages/test-utils/src/cli/command-context.ts†L1-L58】【F:packages/test-utils/src/cli/memory-stream.ts†L1-L25】【F:packages/test-utils/src/cli/reporter.ts†L1-L42】
- Add a `packages/test-utils/src/core/` module that extracts the WordPress harness extensions (`createWordPressTestHarness`, `withWordPressData`, `createApiFetchHarness`) and action/runtime adapters from Core so downstream packages stop depending on relative paths.【F:packages/test-utils/src/core/index.ts†L1-L2】【F:packages/test-utils/src/core/wp-harness.ts†L1-L253】【F:packages/test-utils/src/core/action-runtime.ts†L1-L67】
- Introduce a `packages/test-utils/src/ui/` namespace for the UI runtime harness and reporter wiring currently implemented directly in UI tests, delegating its WordPress setup to the new core exports to avoid circular imports.【F:packages/test-utils/src/ui/index.ts†L1-L1】【F:packages/test-utils/src/ui/kernel-ui-harness.ts†L1-L147】
- Update `packages/test-utils/src/index.ts` to re-export the new domains and add targeted barrel files (`src/cli/index.ts`, `src/core/index.ts`, `src/ui/index.ts`) so consumers have stable import paths.【F:packages/test-utils/src/index.ts†L1-L5】

**Compatibility shims**

- Replace the implementation of the original helper files with re-exports from `@wpkernel/test-utils` while the migration is underway so existing imports continue to resolve.【F:packages/cli/tests/cli-command.test-support.ts†L1-L1】【F:packages/cli/tests/memory-stream.test-support.ts†L1-L1】【F:packages/cli/tests/reporter.test-support.ts†L1-L1】【F:packages/core/tests/wp-environment.test-support.ts†L1-L11】【F:packages/core/tests/action-runtime.test-support.ts†L1-L6】【F:packages/ui/tests/ui-harness.test-support.ts†L1-L16】
- Keep the existing `tests/test-utils/wp.test-support.ts` and `tests/test-utils/wp.ts` shims in place until every package has flipped to the new entry points, then mark them deprecated ahead of removal.【F:tests/test-utils/wp.test-support.ts†L1-L6】【F:tests/test-utils/wp.ts†L1-L1】

**Consumer migration staging**

- Migrate CLI test suites first so the new `cli` domain acts as the proving ground for the shared helpers; monitor type safety via `pnpm --filter @wpkernel/cli typecheck:tests` before deleting the old implementations.
- Follow with Core, moving consumers to `@wpkernel/test-utils/core` and verifying with `pnpm --filter @wpkernel/core test -- --runInBand` to ensure namespace reset behaviour remains intact.
- Once Core and CLI are on the shared surfaces, flip UI to `@wpkernel/test-utils/{core,ui}` and update E2E utilities to consume `@wpkernel/test-utils/integration` exclusively, leaving their public exports intact until external dependants migrate.【F:packages/e2e-utils/src/integration/workspace.ts†L1-L159】【F:packages/e2e-utils/src/integration/cli-runner.ts†L1-L183】

**Verification**

- After each helper extraction, run the corresponding lint/typecheck/test commands for both the origin package and `@wpkernel/test-utils` to confirm the shared modules compile in isolation and that consumers retain their previous behaviour.

### Step (3) implementation blueprint: Migrate consumers & update guidance

**CLI adoption**

- Swap remaining test imports to `@wpkernel/test-utils/cli` (for example, the rule harnesses under `packages/cli/tests/__tests__`) and delete forwarding files like `cli-command.test-support.ts` once the tree builds against the shared module.【F:packages/cli/tests/cli-command.test-support.ts†L1-L1】【F:packages/test-utils/src/cli/index.ts†L1-L3】
- Re-run `pnpm --filter @wpkernel/cli typecheck:tests` and a representative Jest run to ensure Clipanion command contexts keep their expected shape after the direct dependency flip.

**Core migration**

- Update unit and integration suites (cache, resource, action flow) to import WordPress harness helpers from `@wpkernel/test-utils/core` rather than the local shim, then remove the compatibility barrel once no consumers remain.【F:packages/core/tests/wp-environment.test-support.ts†L1-L11】【F:packages/core/tests/resource.test-support.ts†L10-L18】
- Verify the shared helpers still satisfy the Kernel contracts by running `pnpm --filter @wpkernel/core test -- --runInBand` and `pnpm --filter @wpkernel/core typecheck:tests`.

**UI migration**

- Point UI harness consumers (unit hooks, dataview fixtures, runtime stories) at `@wpkernel/test-utils/ui`, passing the package `KernelUIProvider` explicitly so the shared harness can enforce provider wiring.【F:packages/test-utils/src/ui/kernel-ui-harness.ts†L92-L147】【F:packages/ui/tests/ui-harness.test-support.ts†L1-L16】
- Confirm React-specific peer dependencies are satisfied by running `pnpm --filter @wpkernel/ui typecheck:tests` and the relevant Jest suites.

**Integration & e2e**

- Ensure `@wpkernel/e2e-utils` re-exports the shared workspace helpers and drop any duplicated implementations once downstream consumers adopt the shared entry points.【F:packages/test-utils/src/integration/workspace.ts†L1-L73】
- Update manifest/runner helpers to consume `@wpkernel/test-utils/integration` directly and document any intentional shims left behind for compatibility.

**Documentation**

- Revise root and package AGENTS/README files to reference the new `@wpkernel/test-utils/{wp,cli,core,ui}` paths, call out the UI provider requirement, and remove guidance that points to package-private helpers.
- Announce the migration timeline in contributor docs so teams switch their imports before the compatibility files are retired.

**Verification**

- After each package migration, execute the standard lint/typecheck/test matrix for that package plus `pnpm --filter @wpkernel/test-utils typecheck` to verify the shared helpers compile on their own.
