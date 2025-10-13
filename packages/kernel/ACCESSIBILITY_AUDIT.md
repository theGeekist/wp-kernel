# Accessibility & API Surface Audit - `@geekist/wp-kernel`

## Purpose & Scope

This audit reviews the runtime kernel package through an accessibility and API-surface lens. Because the package exposes programmatic primitives rather than UI, the focus is on developer ergonomics, naming consistency, error discoverability, and how easily other packages can compose the public surface.

## High-level Observations

- **Strong error normalization contract.** `KernelError` centralizes error metadata and provides helpers such as `wrap`/`isKernelError`, which keeps downstream consumers aware of failure states and enables structured reporting.
- **Action lifecycle surfaces are comprehensive yet complex.** `defineAction` orchestrates namespace resolution, lifecycle event emission, cache invalidation, and error mapping. The orchestration reads clearly but the breadth of responsibilities raises the barrier to contribution and testing.
- **Resource system exposes predictable helpers.** Cache helpers (`interpolatePath`, `extractPathParams`, `invalidate*`) are exported alongside the `defineResource` factory, maintaining a cohesive naming scheme centred on verbs.
- **Event bus usage is implicit.** Lifecycle events are emitted internally without clear typing on the consumer side, which can obscure accessibility of observability APIs for downstream packages.

## API Surface Consistency

- `actions/index.ts` re-exports follow verb-based naming (`defineAction`, `invokeAction`, `createActionMiddleware`). The alignment between function names and responsibilities is consistent, which aids comprehension.
- The action context helpers hidden behind `resolveOptions`, `createActionContext`, and `emitLifecycleEvent` are private, meaning extending action behaviour requires copying patterns rather than composing utilities. Exposing typed hooks for instrumentation could improve accessibility for integrators.
- Resource helpers consistently use noun-based module names (`resource/cache`, `resource/types`). However, `invalidate` vs `invalidateAll` subtly mix verb phrases with adjectives. Consider aligning on verb-object pairs (e.g., `invalidateKeys`, `invalidateAllKeys`).

## Accessibility & Developer Experience

- **Error Messaging:** `KernelError` defaults ensure every thrown error has a predictable `message`, `code`, and `context`. This greatly improves debuggability and log accessibility, but wrapping native errors in `normalizeError` recreates instances instead of enriching existing ones; stack traces are preserved, yet custom prototypes are lost.
- **Instrumentation Hooks:** Lifecycle events rely on `emitLifecycleEvent` with string phases (`start`, `complete`, `error`). Developers must know the canonical string literals. Providing exported enums or constants would make the API more discoverable and reduce typos.
- **Namespace Discovery:** `getNamespace` is invoked implicitly during action definition. The detection strategy is hidden, making multi-tenant setups harder to reason about. Documenting or exposing the detection surface would improve accessibility for hosts embedding the kernel.

## Complexity & Extensibility

- `defineAction` bundles error normalization, lifecycle emission, cache invalidation, and job scheduling in a single closure. While this enforces convention, the fan-out complicates unit testing. Decomposing into pluggable middleware (already hinted at via `createActionMiddleware`) would enable leaner customisations.
- Cache helpers throw plain `Error` instances when interpolation fails. This violates the repo invariant that all errors become `KernelError`s and leaks inconsistent error semantics to consumers.
- The event bus functions (`recordActionDefined`, `getKernelEventBus`) are singletons, which may restrict future multi-instance support. Injecting the event bus through context would improve future-proofness.

## Opportunities for Composability & Purity

- Expose a public `createLifecycleEvent` utility (currently internal) so observability tooling in other packages can generate identical payloads without duplicating logic.
- Provide pure transformer helpers for namespace and context enrichment so that custom action wrappers (e.g., for analytics) can compose behaviour without reimplementing internal modules.
- Consider returning immutable snapshots for cache key arrays to guarantee purity and prevent accidental mutation by consumers.

## Recommendations

1. Export typed constants for lifecycle phases and event namespaces to reduce stringly-typed ergonomics.
2. Replace plain `Error` throws in resource helpers with `KernelError` instances to maintain consistent error semantics.
3. Document or expose namespace detection hooks so hosts can override resolution in multi-site environments.
4. Introduce a middleware registration API that allows packages to compose action side effects (e.g., instrumentation) without forking `defineAction`.

## Phased Work Plan

### Phase 0 – Define Shared Contracts

- Finalise the canonical lifecycle phase, namespace, and error taxonomy constants in [`packages/kernel/src/contracts/index.ts`](./src/contracts/index.ts) so downstream packages can import them.
- Document how kernel errors should wrap lower-level exceptions so CLI, UI, and E2E tooling can adopt identical semantics in [Accessibility & Observability Contracts](../../contracts/ACCESSIBILITY_CONTRACTS.md).
- Update specs (`configureKernel - Specification.md`, `Architecture Cohesion Proposal.md`) to capture the shared accessibility obligations before consumers depend on them.

### Phase 1 – Harden Kernel Primitives

- Replace remaining plain `Error` throws in resource/cache helpers with typed errors derived from `KernelError`.
- Extract lifecycle emission utilities and middleware registration points into public helpers that mirror the documented contracts.
- Expose namespace detection hooks (and optional overrides) so other packages can rely on a stable interface.

### Phase 2 – Enable Downstream Adoption

- Publish developer-facing guides and reference implementations showing how CLI, UI, and E2E packages consume the shared constants.
- Provide sample middleware/adapters (e.g., instrumentation hooks) that demonstrate safe composition patterns for other teams.
- Schedule follow-up audits to ensure downstream packages use the kernel contracts without diverging, maintaining parity across the monorepo.

## Development References

- [README § Overview](README.md#overview) – recap the kernel’s architectural responsibilities before modifying runtime contracts.
- [README § Quick Start](README.md#quick-start) – follow the bootstrapping path when validating namespace overrides or lifecycle helpers locally.
- [README § Key Patterns](README.md#key-patterns) – consult examples of resources, actions, and jobs when aligning new accessibility contracts with existing naming conventions.
- [README § Accessibility contracts & constants](README.md#accessibility-contracts--constants) – confirm which exported constants must be reused or extended during remediation.
- [Accessibility & Observability Contracts](../../contracts/ACCESSIBILITY_CONTRACTS.md) – authoritative definitions for lifecycle phases, namespaces, errors, and exit codes.
