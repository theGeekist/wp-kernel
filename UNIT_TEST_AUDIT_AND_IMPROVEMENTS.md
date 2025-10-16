# Monorepo Unit Test Audit & Consolidated Plan

## Shared Helper Landscape (2024-10)

- WordPress globals now flow across packages via `tests/test-utils/wp.test-support.ts` and the shared harness exported from `@wpkernel/test-utils/core`, allowing UI and CLI suites to import the published helpers directly instead of hopping through package-private shims.【F:tests/test-utils/wp.test-support.ts†L1-L140】【F:packages/test-utils/src/core/wp-harness.ts†L1-L253】【F:packages/ui/tests/**tests**/ui-harness.test.ts†L1-L36】
- CLI suites depend on the shared command context, memory stream, and reporter helpers published from `@wpkernel/test-utils/cli`, so packages consume a single canonical surface rather than maintaining local copies.【F:packages/test-utils/src/cli/command-context.ts†L1-L58】【F:packages/test-utils/src/cli/memory-stream.ts†L1-L25】【F:packages/cli/src/commands/**tests**/build-command.test.ts†L1-L20】
- Integration and e2e workflows share the workspace primitives exported from `@wpkernel/test-utils/integration`, while `@wpkernel/e2e-utils` layers on CLI transcripts and manifest diffing for Playwright coverage.【F:packages/test-utils/src/integration/workspace.ts†L1-L90】【F:packages/e2e-utils/src/index.ts†L33-L47】【F:packages/e2e-utils/src/integration/fs-manifest.ts†L1-L113】
- Core-specific harnesses (action runtime overrides, resource factories) extend the shared WordPress scaffolding inside `@wpkernel/test-utils/core`, giving suites a canonical upstream module instead of repeating `globalThis` plumbing in each package.【F:packages/test-utils/src/core/action-runtime.ts†L1-L67】【F:packages/core/tests/resource.test-support.ts†L1-L210】

### Package audit passthrough

- **@wpkernel/core** – The shared WordPress harness family (`createWordPressTestHarness`, `withWordPressData`, `createApiFetchHarness`) and action/runtime overrides now live in `@wpkernel/test-utils/core`, and core integration suites import them directly when wiring transport and cache tests.【F:packages/test-utils/src/core/wp-harness.ts†L1-L253】【F:packages/test-utils/src/core/action-runtime.ts†L1-L67】【F:packages/core/src/**tests**/integration/action-flow.test.ts†L12-L33】
- **@wpkernel/cli** – Command coverage hinges on the trio of CLI helpers (`assignCommandContext`, `createMemoryStream`, `createReporterMock`) that are now sourced from `@wpkernel/test-utils/cli`, aligning package suites around one canonical surface.【F:packages/test-utils/src/cli/index.ts†L1-L3】【F:packages/cli/src/config/**tests**/validate-kernel-config.test.ts†L1-L17】【F:packages/cli/tests/**tests**/memory-stream.test.ts†L1-L16】
- **@wpkernel/ui** – DataView and hook suites standardise on the shared UI harness, importing it from `@wpkernel/test-utils/ui` with the package `KernelUIProvider` so runtime wiring stays consistent across specs.【F:packages/test-utils/src/ui/kernel-ui-harness.ts†L1-L147】【F:packages/ui/src/hooks/**tests**/useAction.test.tsx†L1-L26】【F:packages/ui/tests/**tests**/ui-harness.test.ts†L1-L24】
- **@wpkernel/e2e-utils** – The integration helpers (`createIsolatedWorkspace`, `createCliRunner`, manifest diff utilities) and the documented gaps around timeouts and env precedence align with the proposed `integration` namespace for the new package.【F:packages/e2e-utils/UNIT_TEST_AUDIT_AND_IMPROVEMENTS.md†L5-L40】【F:packages/e2e-utils/src/integration/workspace.ts†L26-L189】【F:packages/e2e-utils/src/integration/cli-runner.ts†L1-L183】

## Proposal: @wpkernel/test-utils

### Candidate helper surface

- WordPress global scaffolding (ensuring `window.wp`, namespace resets, env overrides) becomes `@wpkernel/test-utils/wp`, with core action/runtime adapters layered on top as `@wpkernel/test-utils/core` to keep lifecycle contracts centralised.【F:tests/test-utils/wp.test-support.ts†L1-L140】【F:packages/test-utils/src/core/action-runtime.ts†L1-L67】
- Node and integration primitives (temp workspaces, CLI transcripts, file manifests) graduate into `@wpkernel/test-utils/integration`, giving CLI suites and package smoke tests the same spawn/FS semantics before Playwright-specific logic takes over.【F:packages/cli/tests/workspace.test-support.ts†L13-L90】【F:packages/e2e-utils/src/integration/workspace.ts†L26-L105】【F:packages/e2e-utils/src/integration/fs-manifest.ts†L1-L113】
- Domain wrappers (CLI command contexts, UI runtime harness, reporter mocks) surface under focused entry points such as `@wpkernel/test-utils/cli` and `@wpkernel/test-utils/ui`, eliminating the cross-package relative imports we leaned on previously.【F:packages/test-utils/src/cli/command-context.ts†L1-L58】【F:packages/test-utils/src/cli/reporter.ts†L1-L42】【F:packages/test-utils/src/ui/kernel-ui-harness.ts†L1-L147】

### 1. Should we move `@wpkernel/e2e-utils` integration helpers?

- Promote the agnostic layers-`workspace.ts`, `cli-runner.ts`, `fs-manifest.ts`, and their type definitions-into `@wpkernel/test-utils/integration`, then re-export them inside `@wpkernel/e2e-utils` to avoid a breaking change for existing consumers.【F:packages/e2e-utils/src/integration/workspace.ts†L26-L189】【F:packages/e2e-utils/src/integration/cli-runner.ts†L1-L183】【F:packages/e2e-utils/src/integration/fs-manifest.ts†L1-L113】【F:packages/e2e-utils/src/integration/types.ts†L1-L107】
- Keep higher-order Playwright features (`bundle-inspector.ts`, `registry.ts`, `golden.ts`, `config-fabricators.ts`) inside `@wpkernel/e2e-utils`; they carry assumptions about publishing flows and asset inspection that would bloat a general-purpose test package.【F:packages/e2e-utils/src/integration/bundle-inspector.ts†L1-L164】
- This split lets `@wpkernel/test-utils` offer deterministic Node integration primitives while `@wpkernel/e2e-utils` focuses on browser orchestration, keeping release cadence manageable.

### 2. Directory layout for integration helpers

- Prefer the `test-utils/{cli,core}/integration` shape: teams can import their domain surface (`@wpkernel/test-utils/cli`) and drill into `.integration` when needed, keeping unit and integration harnesses adjacent and discoverable.
- Expose a neutral `@wpkernel/test-utils/integration/*` namespace for cross-domain primitives (workspace, CLI runner) that power the domain-specific layers; CLI and e2e code can then re-export as needed without diverging implementations.

### 3. High-leverage deduplication targets

- Reporter mocks and runtime constructors are shared between CLI and UI through the new `@wpkernel/test-utils` surfaces, giving all packages one canonical implementation.【F:packages/test-utils/src/cli/reporter.ts†L1-L42】【F:packages/test-utils/src/ui/kernel-ui-harness.ts†L72-L147】
- Temporary workspace management lives both in CLI (`withWorkspace`, `createWorkspaceRunner`) and e2e helpers (`createIsolatedWorkspace`, manifest writers); sharing an underlying workspace factory eliminates inconsistent teardown behaviour.【F:packages/cli/tests/workspace.test-support.ts†L13-L90】【F:packages/e2e-utils/src/integration/workspace.ts†L26-L189】
- WordPress harness plumbing (namespace resets, `withWordPressData`, API fetch harness) already crosses package boundaries; moving it behind `@wpkernel/test-utils/wp` prevents further relative imports and keeps namespace hygiene in sync.【F:tests/test-utils/wp.test-support.ts†L1-L140】【F:packages/test-utils/src/core/wp-harness.ts†L1-L253】
- Environment utilities such as `setProcessEnv` and global clean-up routines are re-implemented in ad-hoc suites; promoting them will reduce bespoke `beforeEach` blocks and improve coverage of negative paths that depend on shared state.【F:tests/test-utils/wp.test-support.ts†L69-L140】【F:packages/core/tests/resource.test-support.ts†L180-L210】

### 4. Should root test-utils live in the package?

- Yes. The root `tests/test-utils/wp.test-support.ts` is already the canonical entry point for WordPress globals; folding it into `@wpkernel/test-utils` preserves the existing alias while giving other packages a published, versioned dependency instead of a filesystem path.【F:tests/test-utils/wp.test-support.ts†L1-L140】

## Recommendation & Next Steps

**Next Steps**
(1) ✓ Scaffolded `packages/test-utils` with shared WordPress and workspace primitives behind domain-specific entry points and updated monorepo tooling to recognise the new package.
(2) ✓ Expanded `@wpkernel/test-utils` to host CLI, Core, and UI helper domains while maintaining temporary shims inside each package.
(3) ✓ Migrated package consumers and documentation to the shared surfaces, retiring the compatibility layers once adoption completed.

### Step (1) implementation blueprint: Scaffold `@wpkernel/test-utils`

STATUS: **COMPLETED**

### Step (2) implementation blueprint: Expand `@wpkernel/test-utils` domains before migrating consumers

STATUS: **COMPLETED**

### Step (3) implementation summary: Migrate consumers & update guidance

STATUS: **COMPLETED**

- **CLI adoption** – All command and helper suites import command contexts, memory streams, and reporter mocks directly from `@wpkernel/test-utils/cli`, and the compatibility files were removed alongside updated package docs.【F:packages/cli/tests/**tests**/cli-command.test.ts†L7-L26】【F:packages/cli/src/config/**tests**/validate-kernel-config.test.ts†L1-L17】【F:packages/cli/README.md†L64-L79】
- **Core migration** – Core unit/integration suites now reference the shared WordPress harness and action runtime adapters from `@wpkernel/test-utils/core`, with the legacy re-export files deleted.【F:packages/core/src/**tests**/integration/action-flow.test.ts†L12-L31】【F:packages/core/tests/resource.test-support.ts†L10-L43】【F:packages/test-utils/src/core/index.ts†L1-L2】
- **UI migration** – UI harness consumers import the shared runtime from `@wpkernel/test-utils/ui` while explicitly passing `KernelUIProvider`, and the local wrapper was removed.【F:packages/ui/tests/**tests**/ui-harness.test.ts†L1-L24】【F:packages/ui/src/hooks/**tests**/useAction.test.tsx†L1-L26】【F:packages/test-utils/src/ui/kernel-ui-harness.ts†L92-L147】
- **Integration & e2e** – `@wpkernel/e2e-utils` re-exports the shared workspace helpers so Playwright fixtures can depend on the same primitives as CLI suites.【F:packages/e2e-utils/src/index.ts†L33-L47】【F:packages/test-utils/src/integration/workspace.ts†L1-L90】
- **Documentation** – Root and package AGENTS/READMEs plus contributor docs now direct teams to the shared `@wpkernel/test-utils` surfaces and call out the UI provider requirement.【F:AGENTS.md†L43-L46】【F:packages/core/AGENTS.md†L10-L21】【F:packages/ui/README.md†L142-L152】【F:docs/contributing/testing.md†L23-L27】
- **Verification** – `pnpm --filter @wpkernel/cli typecheck:tests`, `pnpm --filter @wpkernel/cli test -- --runInBand`, `pnpm --filter @wpkernel/core typecheck:tests`, `pnpm --filter @wpkernel/core test -- --runInBand`, `pnpm --filter @wpkernel/ui typecheck:tests`, `pnpm --filter @wpkernel/ui test -- --runInBand`, `pnpm --filter @wpkernel/test-utils typecheck`, and `pnpm --filter @wpkernel/e2e-utils test` all pass after the migration.【4bb954†L1-L5】【c04d90†L1-L4】【9ddf1f†L1-L4】【1f777d†L1-L4】【398075†L1-L4】【8a4408†L1-L4】【67235f†L1-L4】【6e8050†L1-L4】【90d1d6†L1-L9】
