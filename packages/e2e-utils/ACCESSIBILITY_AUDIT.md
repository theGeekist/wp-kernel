# Accessibility & API Surface Audit - `@geekist/wp-kernel-e2e-utils`

## Purpose & Scope

Evaluate the end-to-end utilities package for discoverability of fixtures, consistency of helper APIs, and opportunities to keep composable boundaries between Playwright and kernel abstractions.

## High-level Observations

- **Single factory entry point.** `createKernelUtils` exposes `resource`, `store`, `events`, and `dataview` helpers from one surface, which keeps onboarding straightforward.
- **Type definitions drive usage.** `types.ts` describes each helper’s contract, but some generic parameters (e.g., `StoreUtils<T>`) rely on `unknown` fallbacks, which can reduce type safety.
- **Playwright fixture extension is ergonomic.** `test.ts` re-exports `test` and `expect`, embedding kernel utilities into the fixture graph without breaking existing `@wordpress/e2e-test-utils-playwright` semantics.

## Helper Surface Consistency

- Helper creators use verb-first naming (`createResourceHelper`, `createStoreHelper`, `createEventHelper`). Public APIs use nouns (`kernel.resource`, `kernel.store`, `kernel.events`), forming a consistent pattern.
- Internal helper functions throw plain `Error` instances (e.g., failed `interpolatePath`), diverging from kernel-wide `KernelError` usage. Aligning error semantics would help tests surface actionable feedback.
- Event recorder helpers rely on loose options structures. Providing discriminated unions for subscription patterns (regex vs. predicate) would make the API more explicit.

## Accessibility & Developer Experience

- **Documentation:** Inline examples in `createKernelUtils` and `test.ts` show realistic workflows, reducing ramp-up time. Consider centralising these examples in the README to consolidate learning resources.
- **Async ergonomics:** Helpers return Promises where appropriate, but only `events` is async. Aligning API surfaces (e.g., allowing `dataview` to perform async setup) might be necessary if future helpers need asynchronous bootstrapping.
- **Namespace awareness:** `createKernelUtils` checks `window.wpKernelNamespace` implicitly. Surface a helper to assert namespace detection so tests can fail fast when namespaces are misconfigured.

## Complexity & Extensibility

- `createKernelUtils` owns request path interpolation, store waiting, and event subscription logic. The module is readable but mixes concerns (REST seeding, store polling, DOM instrumentation). Splitting into submodules could ease maintenance.
- `createResourceHelper` couples path interpolation with fetch logic. Extracting interpolation into a pure function would improve testability and reuse outside Playwright contexts.
- Event recorder currently polls the page context for broadcast events. Introducing streaming listeners or exposing lower-level primitives would support more complex event assertions without duplicating logic.

## Opportunities for Composability & Purity

- Export lower-level pure helpers (e.g., `buildRemovePath`) so custom fixtures can reuse error-handled logic without full factory instantiation.
- Provide TypeScript utility types that map resource configs to helper signatures, improving type inference when tests use strongly typed resources.
- Allow dependency injection for the reporter/logging surface so tests can capture structured telemetry.

## Recommendations

1. Replace plain `Error` throws with `KernelError` (or dedicated `E2EError`) instances to align with framework error semantics.
2. Document namespace detection expectations and provide a helper (`assertNamespace`) to aid debugging.
3. Consider modularising `createKernelUtils` into smaller focused files (resource/store/events/dataview) to reduce coupling and encourage reuse.
4. Enrich type exports so generics infer concrete resource item/query shapes without manual casting.

## Phased Work Plan

### Phase 0 – Align with Global Contracts

- Adopt the shared error taxonomy and namespace constants exported by `@geekist/wp-kernel/contracts`, ensuring fixtures throw/report consistent metadata.
- Update package docs to explain how Playwright tests should consume the cross-package accessibility and observability contracts defined in [Accessibility & Observability Contracts](../../contracts/ACCESSIBILITY_CONTRACTS.md).
- Coordinate with kernel and CLI teams to align reporter output so CI tooling can aggregate results without bespoke adapters.

### Phase 1 – Modularise Core Helpers

- Refactor `createKernelUtils` to source interpolation, namespace, and lifecycle helpers from the kernel’s shared modules.
- Split resource/store/event/dataview helpers into focused modules that expose the same contract while enabling independent testing.
- Provide an `assertNamespace` helper and other pure utilities that wrap the shared constants for test authors.

### Phase 2 – Strengthen Type & Fixture Ergonomics

- Extend TypeScript utility types so resource configs infer helper signatures without manual generics, relying on the shared kernel definitions.
- Add configurable reporter/logging adapters that emit structured telemetry compatible with the monorepo observability contract.
- Publish example Playwright tests showcasing the modular helpers and demonstrating safe composition under the shared contracts.

## Development References

- [README § Overview](README.md#overview) – understand the fixture ecosystem and optional nature of the package before planning accessibility changes.
- [README § Key Features](README.md#key-features) – map utilities to the shared contracts (auth, db, store) when expanding fixtures or adopting new error semantics.
- [README § Validation Strategy](README.md#validation-strategy) – follow the recommended verification approach to confirm new helpers behave correctly inside real WordPress environments.
- [README § Accessibility contracts & constants](README.md#accessibility-contracts--constants) – confirm Playwright helpers import the kernel contract exports before asserting lifecycle telemetry.
- [Accessibility & Observability Contracts](../../contracts/ACCESSIBILITY_CONTRACTS.md) – definitive guidance on lifecycle phases, namespaces, errors, and exit codes for test authors.
