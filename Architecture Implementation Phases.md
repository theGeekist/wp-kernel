# Architecture Implementation Phases

- The following phases translate the specifications in [configureKernel - Specification.md](configureKernel - Specification.md), [UI Package Architecture Fix - Specification.md](UI Package Architecture Fix - Specification.md), and [Architecture Cohesion Proposal.md](Architecture Cohesion Proposal.md) into incremental, testable work packages.
- Each phase is self-contained: code, documentation, and tests must ship together so the framework remains usable between phases.
- Where a phase introduces temporary bridges, the next phase explicitly closes them.
- Please refer to the respective documents above for deeper insight when completing each phases and always come back to the document to update work done and summary notes accordingly

---

## SHARED ACCEPTANCE CRITERIA

- Run `pnpm typecheck` and `pnpm typecheck:tests`
- Run `pnpm lint --fix`, the result will fail if your functions are high in complexity
- git `pre-commit hooks` will run all of the above, so it will take roughly ~30 seconds. _It is important you wait. Use `CI=1 git commit...`_
- Not running the above will fail in CI when you push you PR.
- Respect AGENTS.md

## Phase 1 – Canonical Bootstrap Skeleton

**Objective**  
Introduce `configureKernel()` as the primary bootstrap while forwarding to existing
infrastructure so current plugins remain functional.

**Scope**

- Add `configureKernel()` that internally delegates to `withKernel()` and existing
  registry wiring.
- Expose a preliminary `KernelInstance` object with `getNamespace()`,
  `getReporter()`, `invalidate()`, and `emit()` delegating to existing helpers.
- Add `ui` option plumbing without activating runtime changes yet
  (`ui.enable` returns `false` unless explicitly enabled).
- Leave `withKernel()` exported but update documentation to recommend
  `configureKernel()`.

**Documentation**

- `README.md` – new bootstrap examples referencing `configureKernel()`.
- `docs/guide/data.md` – replace “call `withKernel()`” steps with
  “call `configureKernel()`.”
- `docs/packages/kernel.md` – list the new entry point and describe the returned instance.

**Testing**

- Unit: `packages/kernel/src/data/__tests__` to cover `configureKernel()`.
- Integration: adjust showcase bootstrap (app/showcase) to use the new API and
  run existing Playwright suite.

**Acceptance Criteria**

- `configureKernel()` can replace existing `withKernel()` bootstraps without breaking tests.
- Documentation references the new entry point.
- Complete the "Summary of work done below"

**Summary of work done**
Implemented `configureKernel()` on top of the existing registry wiring, exposed the initial `KernelInstance` helpers, threaded the `ui` option, updated showcase + documentation to prefer the new bootstrap, and added coverage to prove the delegation to `withKernel()`.

---

## Phase 2 – KernelUIRuntime Integration (Read the report in "./UI Package Architecture Fix - Specification.md")

**Objective**  
Replace UI side-effect imports with the explicit runtime contract.
Legacy globals and side-effect modules are removed outright.

**Scope**

- Implement `KernelUIRuntime`, `kernel.hasUIRuntime()`,
  `kernel.getUIRuntime()`, and `kernel.attachUIBindings()`.
- Update `@geekist/wp-kernel-ui` hooks to consume the runtime instead of globals;
  delete the global queue/attachment code and the side-effect entry point.
- Ensure the kernel treats UI adapters as optional-no automatic imports or
  globals. Consumers pass `attachUIBindings` via configuration or call
  `kernel.attachUIBindings()` manually.
- Document the breaking change in the unreleased sections of
  `packages/kernel/CHANGELOG.md` and `packages/ui/CHANGELOG.md`.

**Documentation**

- `docs/packages/ui.md` – describe paired usage (`KernelUIProvider`), runtime structure,
  and standalone adapters.
- `docs/api/useAction.md`, `docs/guide/actions.md`, `docs/guide/resources.md`,
  `docs/guide/prefetching.md` – update setup instructions to mention runtime
  availability and remove side-effect import guidance.
- `README.md` – add UI integration example with `KernelUIProvider`.

**Testing**

- Unit: refactor `packages/ui/src/hooks/__tests__` to construct a runtime before
  asserting hook behavior; remove assertions for the global shim.
- Showcase: update React entry point to wrap the app with `KernelUIProvider`.
- Playwright: rerun to ensure UI flows pass with runtime-based hooks.

**Acceptance Criteria**

- Importing UI hooks without supplying an adapter emits a typed `KernelError`.
- Runtime-backed hooks pass the existing test suite; legacy globals are gone.
- Complete the "Summary of work done below"

**Summary of work done**
Introduced the adapter-driven integration (`attachUIBindings`, `KernelUIProvider`),
updated UI tests and documentation, and recorded the breaking-change guidance in
the package changelog. Legacy globals (`__WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__`
and the cached dispatch bridge) remain in place pending the deeper rewire slated
for Phase 3, so they are intentionally documented as follow-up work.

---

## Phase 3 – Typed Event Bus Foundations

**Objective**  
Surface a cohesive event system (`KernelEventBus`) and rely on it for runtime
integration, while maintaining the `wp.hooks` bridge.

**Scope**

- Implement `KernelEventBus` with typed events (`resource:defined`,
  `action:defined`, `action:completed`, etc.).
- Update resource/action creation to emit through the event bus.
- Update `kernelEventsPlugin` to subscribe to the bus instead of intercepting
  internal helpers while still bridging into `wp.hooks`.
- Modify UI runtime to depend on event subscriptions rather than queued globals.
- Record the new event bus in `packages/kernel/CHANGELOG.md` (unreleased) and
  publish the canonical event catalogue (system `wpk.*` events, domain CRUD events
  such as `{namespace}.{resource}.created/updated/removed`, and references to the
  namespace helpers exported by `@geekist/wp-kernel/namespace`) in the refreshed docs.

**Documentation**

- `docs/guide/events.md` – describe the event bus, emitted events, and the bridge.
- `docs/packages/kernel.md` – document `kernel.events` and subscription helpers.
- `docs/guide/data.md` / `docs/guide/actions.md` – add examples of subscribing to lifecycle events.
- Capture the full event taxonomy (system `wpk.resource.*`, `wpk.action.*`,
  `wpk.cache.invalidated`, `wpk.job.*`, `wpk.policy.denied`, plus domain CRUD
  patterns) and call out the default namespace behaviour (auto-detection, explicit
  overrides via `namespace` config, and helpers from `@geekist/wp-kernel/namespace`).

**Testing**

- Add unit tests for the event bus (emission, subscription lifecycle).
- Update existing action/resource tests to assert events fire correctly.
- Regression-test UI hook attachment via events (no reliance on global queue).

**Acceptance Criteria**

- Respect AGENTS.md
- UI runtime operates solely via event subscriptions.
- `kernelEventsPlugin` continues to emit to `wp.hooks`.
- Event bus tests cover at least the defined canonical events.
- Complete the "Summary of work done below"

**Summary of work done**
Promoted lifecycle emission to the typed `KernelEventBus`, exposed the bus via `kernel.events`, refactored `kernelEventsPlugin`
to listen on the bus while continuing the `wp.hooks` bridge, and updated UI hooks to attach through `resource:defined` events
rather than global queues.

---

## Phase 4 – Registry Ownership by configureKernel

**Objective**  
Align action, policy, and job definition signatures with shared config objects,
removing positional overloads entirely.

**Scope**

- Inline registry bootstrap logic into `configureKernel()` and remove the
  `withKernel` export; update all call sites to use the instance methods
  instead.
- Thread the configured registry through cache helpers so `kernel.invalidate()`
  and related utilities operate on the instance’s registry rather than
  `getWPData()`.
- Enhance teardown (`kernel.teardown()`) to dispose of middleware and
  listeners installed during configuration.
- Update `packages/kernel/CHANGELOG.md` and related specs to document the
  transition.

**Documentation**

- `docs/guide/data.md` / `docs/guide/actions.md` – update bootstrap examples to
  rely solely on `configureKernel()`.
- `docs/packages/kernel.md` – describe new teardown behaviour and cache
  routing.
- `README.md` – remove remaining references to `withKernel()`.

**Testing**

- Kernel registry tests updated to confirm instance-based bootstrap/teardown.
- Cache invalidation tests verify registry threading.
- Showcase integration tests cover the new bootstrap.

**Acceptance Criteria**

- Respect AGENTS.md
- No code paths invoke `withKernel()`.
- `kernel.invalidate()` respects the configured registry.
- Teardown removes registry middleware and listeners.
- Complete the "Summary of work done below"

**Summary of work done**
Inlined the registry bootstrap directly into `configureKernel()`, retired the standalone `withKernel` export, threaded the instance registry through cache invalidation helpers, and refreshed documentation/specs to reflect the instance-driven bootstrap and teardown semantics.

---

## Phase 5 – UI Runtime Cleanup

**Objective**  
Synchronize all reference material with the final architecture and clean up
remaining compatibility layers.

**Scope**

- Remove `__WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__`,
  `__WP_KERNEL_UI_PROCESS_PENDING_RESOURCES__`, and the cached action
  dispatcher.
- Ensure `attachUIBindings()` performs all bindings via runtime events.
- Update changelog/specs to reflect the final adapter-only behaviour.

**Documentation**

- `UI Package Architecture Fix - Specification.md` – capture the final runtime
  architecture.
- `configureKernel - Specification.md` – confirm adapters are the sole entry
  point.
- `docs/packages/ui.md` and hook guides – remove references to legacy globals.

**Testing**

- Resource/action tests updated for event-driven attachment.
- UI hook tests ensure adapter-driven flow.
- Showcase manual verification confirms no globals remain.

**Acceptance Criteria**

- Respect AGENTS.md
- No `__WP_KERNEL_UI_*` globals remain and no cached dispatcher is in use.
- Documentation/specs align with the final adapter-only runtime.
- Complete the "Summary of work done below"

**Summary of work done**
Retired the `__WP_KERNEL_UI_*` compatibility layer by resolving action dispatchers directly from the WordPress registry, refreshed UI tests for the event-driven flow, and updated the specs/state docs to document adapter-only runtime integration.

---

## Phase 6 – Config-Object Definitions & API Cohesion

**Objective**  
Align action, policy, and job definition signatures with shared config objects,
removing positional overloads entirely.

**Scope**

- Update core exports (`defineAction`, `definePolicy`, `defineJob`) to accept
  `{ name, handler, options }` config objects exclusively. Delete positional
  overloads and helper wrappers.
- Adjust TypeScript types, error messages, and runtime validations accordingly.
- Refactor dependent code in `packages/kernel`, `packages/ui`, and showcase app
  to use the new signatures.
- Document the breaking API change in `packages/kernel/CHANGELOG.md`
  (unreleased).

**Documentation**

- `docs/guide/actions.md`, `docs/guide/policy.md`, `docs/guide/jobs.md` – rewrite examples
  with config object signatures.
- `docs/api/index.md` – update API tables to reflect the new call shapes.
- `docs/packages/kernel.md` – detail the standardized patterns.

**Testing**

- Update unit tests covering action/policy/job definitions to the new syntax.
- Ensure TypeScript test build (`pnpm typecheck:tests`) passes with updated typings.

**Acceptance Criteria**

- Positional-call usage is removed; only config-object signatures remain.
- All tests and type checks continue to pass with the config-object pattern.
- Complete the "Summary of work done below"

**Summary of work done**
Replaced the positional `defineAction()` and `definePolicy()` signatures with
configuration objects, updated runtime validation + error messaging, refactored
tests and documentation to the new call shape, and noted the breaking change in
the kernel changelog.

---

## Phase 7 – Documentation & Example Consolidation

**Objective**  
Synchronize all reference material with the final architecture and clean up
remaining compatibility layers.

**Scope**

- Rewrite high-level guides (`docs/index.md`, `docs/guide/philosophy.md`,
  `docs/guide/showcase.md`) to reflect the final architecture.
- Audit README snippets, ensuring all examples align with `configureKernel()`,
  `KernelUIProvider`, and event bus usage.
- Update `CURRENT_STATE.md` to match the new architecture baseline.
- Add final release notes to relevant CHANGELOG files summarising the overhaul.

**Documentation**

- Comprehensive sweep across `/docs` and package READMEs, following the “Documentation Impact” lists from the specifications.
- Update the roadmap in `docs/contributing/roadmap.md` to mark completed phases and outline future enhancements.

**Testing**

- Full test suite (`pnpm lint --fix`, `pnpm typecheck`, `pnpm typecheck:tests`, `pnpm test`) plus Playwright.
- Optional: add example-driven tests (e.g., markdown-snippet verification) to prevent drift.

**Acceptance Criteria**

- No references to deprecated patterns (`withKernel` bootstrap, global UI hooks, positional definitions) remain in project docs.
- Compatibility layers removed where safe, and all automated checks pass.
- Complete the "Summary of work done below"

**Summary of work done**
`<placeholder to be replaced when complete>`

---

End of document.
