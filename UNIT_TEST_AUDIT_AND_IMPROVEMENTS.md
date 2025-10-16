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
(1) Scaffold `packages/test-utils` with WordPress + workspace primitives migrated under domain-specific entry points. Ensure monorepo configs are updated to recognise this new package
(2) Update CLI, Core, UI, and e2e packages to consume the new surfaces, leaving compatibility re-exports until downstream branches land.
(3) Refresh root + package AGENTS/README guidance to point at `@wpkernel/test-utils`, then retire direct relative imports.
