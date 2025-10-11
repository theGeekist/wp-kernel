# DataViews Integration – Phased Delivery

> Roadmap aligned with [`DataViews Integration - Specification.md`](./DataViews%20Integration%20-%20Specification.md). Each phase references relevant sections to keep implementation contextual and auditable for the cloud agent. Phase deliverables assume the Gutenberg snapshot lives under [`packages/ui/vendor/dataviews-snapshot/`](vendor/dataviews-snapshot/README.md), while runtime imports continue to use the published `@wordpress/dataviews` package (`node_modules`). For feature reference, see [`packages/ui/wp-dataviews.md`](wp-dataviews.md).

---

### Shared Deliverable Expectations

- Set `CI=1` before running git commands inside automation, and never bypass pre-commit hooks.
- For UI work, run `pnpm --filter @geekist/wp-kernel-ui lint --fix`, `pnpm --filter @geekist/wp-kernel-ui typecheck`, and `pnpm --filter @geekist/wp-kernel-ui test --coverage` before marking a phase complete. Maintain ≥95% statements/lines and ≥98% functions coverage for the package.
- When phases touch kernel or CLI packages, run the corresponding filtered commands (`pnpm --filter @geekist/wp-kernel typecheck`, `pnpm --filter @geekist/wp-kernel-cli test`) to catch cross-package regressions.
- Add/update documentation alongside code (spec references, README snippets, docs/ guide pages). Note any doc drift in the status log.
- Integration/E2E tests should live under `packages/ui/__tests__/integration` or the Playwright suite (`@geekist/wp-kernel-e2e`) as appropriate; include fixtures under `packages/ui/fixtures`.
- Update the Status Log entry within each phase section before completion (include Completed/Outstanding/Risks).
- Respect the declared `@wordpress/dataviews` peer range (`^N.M.0`). CI runs must cover WordPress stable−1, stable, and Gutenberg nightly; log a reporter warning when versions drift.

**The precommit hook will run test --coverage and will fail if you don't meet the coverage criteria** So its best your write code that aids testing, test branch logic and run `pnpm test --coverage` before attempting to commit so you save time

---

## Phase 1 – Kernel UI Runtime Foundations

**Spec references:** §4.1 Kernel UI Runtime Extensions, §4.7 View Persistence  
**Goal:** Extend `KernelUIRuntime` and `attachUIBindings` to host DataViews controllers, events, and preference adapters.

- **Scope:**
    - Extend runtime types with `dataviews` namespace (registry, controllers, preferences).
    - Implement default `DataViewPreferencesAdapter` (user scope via `core/preferences`) with user→role→site resolution plumbing (role/site temporarily no-op).
    - Emit typed kernel events (`ui:dataviews:*`) from the runtime scaffold.
    - Add reporter child namespace helpers and error classes (`DataViewsConfigurationError`, etc.).
    - Provide a maintenance script (`packages/ui/scripts/update-dataviews-snapshot.ts`) to refresh the vendor snapshot from Gutenberg, run `pnpm --filter @geekist/wp-kernel-ui typecheck`, verify the snapshot version satisfies the peer range, and log `SUCCESS: snapshot synchronized to <git sha>`.
    - Unit tests for adapter precedence, event emission, and error paths.

- **Deliverables:** updated runtime modules (`packages/ui/src/runtime/**`), new adapter utilities, error classes, tests under `packages/ui/src/runtime/__tests__`.

- **DoD:** UI package unit tests + coverage pass; no integration code yet; Status Log notes reporter/event coverage. `pnpm --filter @geekist/wp-kernel-ui test --coverage` ≥95/98.

- **Testing:** Jest unit tests (preferences precedence, event bus usage).

- **Status Log:** _TBD_

---

## Phase 2 – Resource DataView Controller & Components

**Spec references:** §4.3 Query & Data Orchestration, §4.4 Actions, Policies, and Editing  
**Goal:** Deliver the controller utilities and React component wrappers that marry kernel resources/actions with the DataViews UI.

- **Scope:**
    - Implement `createResourceDataViewController` translating DataViews state → resource queries via the `QueryMapping` contract and exposing data/loading/errors via hooks.
    - Implement `createDataFormController` bridging `DataForm` with kernel actions and cache invalidation.
    - Create `ResourceDataView` React component composing controller outputs with the snapshot DataViews component, including policy-gated actions and error normalization rules.
    - Provide storybook-ready fixtures under `packages/ui/fixtures/dataviews` using the snapshot types.

- **Deliverables:** controller utilities (`packages/ui/src/dataviews/`), React component, fixtures, unit tests (React Testing Library) validating sort/search/pagination mapping and action dispatch.

- **DoD:** All UI tests (unit + integration) pass; coverage updated; component documented in README; Status Log notes policy gating coverage.

- **Testing:** Jest with React Testing Library; integration test verifying controller + mock resource interplay.

- **Status Log:** _TBD_

---

## Phase 3 – configureKernel Integration & Registry Wiring

**Spec references:** §4.5 configureKernel Integration, §5 API Surface Summary  
**Goal:** Auto-register DataViews runtime pieces during kernel bootstrapping and ensure events/hooks fire end-to-end.

- **Scope:**
    - Extend `ConfigureKernelOptions.ui.options` to accept DataViews flags/adapters.
    - Update `configureKernel` to initialise DataViews runtime when enabled and to honour `autoRegisterResources`.
    - Listen to `resource:defined` events to register controllers derived from `resource.ui?.admin?.dataviews`.
    - Add integration tests under `packages/kernel/src/data/__tests__/` mocking UI attach to confirm controllers register and emit events.

- **Deliverables:** kernel runtime updates, integration fixtures, additional coverage for event flows.

- **DoD:** `pnpm --filter @geekist/wp-kernel typecheck` and unit/integration tests pass; UI package tests still green; Status Log records integration scenarios executed.

- **Testing:** Jest integration tests covering configureKernel + runtime interplay (including teardown) plus snapshot tests for emitted events.

- **Status Log:** _TBD_

---

## Phase 4 – Resource Metadata & CLI Bridge

**Spec references:** §4.2 Resource Metadata & CLI Config, §5 API Surface Summary  
**Goal:** Surface DataViews configuration on resources and ensure CLI tooling propagates metadata for generators.

- **Scope:**
    - Extend `ResourceConfig` and `ResourceObject` types with `ui.admin.dataviews`.
    - Update CLI validators (`validate-kernel-config`) and loader to accept new metadata.
    - Ensure generated code (e.g., `wpk generate admin-page`) emits scaffolding referencing `ResourceDataView`, optional menu registration, and fixture files per the spec.
    - Carry forward Phase 3 follow-ups: document the controller registry contract and expose any additional metadata the CLI needs for auto-registration.
    - Add CLI unit tests verifying validation, metadata propagation, and generator outputs (golden fixtures).

- **Deliverables:** kernel type updates, CLI schema updates/tests, generator fixture updates, documentation refresh (`docs/packages/ui.md`, CLI docs).

- **DoD:** Kernel + CLI test suites pass; generator integration tests confirm React screen, optional PHP menu, and fixture outputs; docs updated; Status Log records new fixtures and doc links.

- **Testing:** Jest unit tests for CLI validators, integration tests for generator command using temp workspace.

- **Status Log:** _TBD_

---

## Phase 5 – Documentation, E2E, & Accessibility Planning

**Spec references:** §6 Implementation Plan (Docs & Testing), §9 Deferred Items & Follow-Ups  
**Goal:** Final polish for MVP: documentation, example screens, and Playwright regression coverage; log accessibility follow-up tasks for the dedicated sprint.

- **Scope:**
    - Update `docs/packages/ui.md`, create a dedicated DataViews guide, and ensure the showcase app demonstrates the new `ResourceDataView`.
    - Update the showcase app to use `ResourceDataView` and `createDataFormController` for at least one resource screen, replacing any legacy table implementation.
    - Extend `@geekist/wp-kernel-e2e-utils` (or add test fixtures under `packages/ui/fixtures/dataviews`) with helpers that make writing Playwright specs straightforward; do **not** add new Playwright specs in-cloud, just ship the helpers and document usage.
    - Document migration guidance (Phase 0 snapshot, compat data provider) in `/docs/`.
    - Create accessibility backlog items referencing the roadmap sprint (link in doc/Status Log).

- **Deliverables:** documentation updates, Playwright specs under `e2e/`, migration notes, backlog references.

- **DoD:** `pnpm test` (full suite) passes including Playwright (`pnpm --filter @geekist/wp-kernel-e2e test`); docs published locally via `pnpm docs:dev` smoke test; showcase example updated; Accessibility tasks logged; Status Log summarises coverage results.

- **Testing:** Playwright E2E, doc build (`pnpm docs:build`) smoke test.

- **Status Log:** _TBD_

---

### Status Log Template

| Phase | Completed Deliverables                                                                                                                                             | Outstanding Work                                                                    | Risks / Notes                                                                                                         |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| P1    | Kernel UI runtime exposes DataViews namespace with preferences adapter, events, errors, and snapshot updater script.                                               | None                                                                                | Snapshot script depends on local Gutenberg checkout; ensure `GUTENBERG_PATH` is set in environments without the repo. |
| P2    | Resource DataView controller, DataForm controller, React wrapper, and fixtures implemented with unit coverage for query mapping, persistence, and action dispatch. | Document standalone runtime usage guidance and extend integration tests in Phase 3. | DataViews snapshot remains reference-only; ensure runtime imports continue to resolve from `node_modules`.            |
| P3    | configureKernel auto-wires DataViews runtime options, registering controllers on `resource:defined` and bridging `ui:dataviews:*` events.                          | None                                                                                | Kernel + UI integration tests cover resource replay, live registration, and event emission.                           |
| P4    | Resource metadata typed for DataViews; CLI validation/IR propagate it and generators emit `.generated/ui` screens, fixtures, and optional PHP menus.               | None                                                                                | CLI outputs require declarative metadata (functions are rejected during serialisation).                               |
| P5    | -                                                                                                                                                                  | -                                                                                   | -                                                                                                                     |
