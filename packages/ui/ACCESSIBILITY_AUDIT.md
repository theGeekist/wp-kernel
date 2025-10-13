# Accessibility & API Surface Audit - `@geekist/wp-kernel-ui`

## Purpose & Scope

Assess the UI package for accessibility guarantees, naming consistency, and composability of hooks/components that wrap the kernel runtime.

## High-level Observations

- **Runtime context is explicit.** `KernelUIProvider` and `useKernelUI` supply runtime access with guarded errors, ensuring developers receive actionable messaging when context is missing.
- **Data View integration leverages WordPress primitives.** `ResourceDataView` wraps `@wordpress/dataviews`, maintaining visual and keyboard behaviour provided by core components.
- **Async & empty states are configurable.** `ResourceDataView` accepts `emptyState` slots and derives loading state from resource queries, promoting accessible state transitions when the provided markup is semantically correct.

## Component & Hook Consistency

- Components follow noun-based names (`ResourceDataView`, `KernelUIProvider`). Hooks use verb phrases (`useResolvedController`, `useDataViewActions`) adhering to React conventions.
- Controller utilities derive view/query state through deterministic functions. However, some hooks (e.g., `useDataViewActions`) return plain arrays of action descriptors; aligning on typed discriminated unions could improve predictability for downstream composition.
- Runtime helpers in `runtime/index.ts` export a cohesive bundle (`KernelUIProvider`, `useKernelUI`, `attachUIBindings`). Naming is consistent, though the attachment function couples DOM querying with event dispatching, which may limit reuse in non-browser environments.

## Accessibility Review

- **Semantic wrappers:** `ResourceDataView` renders a `div` container with `data-` attributes but delegates ARIA semantics to `DataViews`. Since the component does not inject headings or landmark roles, embedding developers must ensure context is provided. Consider documenting recommended wrappers (e.g., `section` with `aria-labelledby`).
- **Focus management:** Selection state is maintained via `useState`, while `DataViews` handles keyboard interactions. Hooks do not currently expose focus restoration; adding callbacks would improve accessibility when the view updates after mutations.
- **Error surfacing:** When controllers fail to fetch data, `useListResult` likely relies on reporters. Ensure any error UI surfaces provide screen-reader accessible messaging; exposing an `errorState` slot akin to `emptyState` would make this explicit.
- **Internationalisation:** Strings are largely delegated to WordPress components, but `searchLabel` defaults may be undefined. Encourage passing translated labels or provide defaults via `@wordpress/i18n`.

## Complexity & Extensibility

- `ResourceDataView` orchestrates runtime resolution, controller derivation, memoisation, pagination, and selection in a single component. Splitting into compound components (e.g., `ResourceDataView.Container`, `.Table`, `.Toolbar`) could reduce prop overload and allow alternative layouts while preserving shared logic.
- Controller resolution accepts either resource objects or explicit configs, improving flexibility. However, implicit fallbacks (inferring `id` from `item.id`) may hide bugs when resources use custom identifiers. Providing dev-mode warnings would improve future-proofness.
- `attachUIBindings` bridges the kernel runtime to DOM nodes. It assumes a single container element; exposing a cleanup API or supporting multiple mounts would improve composability for micro-frontend scenarios.

## Opportunities for Composability & Purity

- Export lower-level hooks (e.g., `useStableView`, `useListResult`) from the package root so teams can assemble custom UI while reusing logic.
- Provide headless controller primitives that return state/action dictionaries without rendering `DataViews`, enabling other design systems to benefit from the resource orchestration.
- Introduce accessible defaults for `emptyState` and future `errorState` slots (e.g., `<Notice status="info">`), ensuring consistent semantics across consumers.

## Recommendations

1. Document accessibility expectations for `ResourceDataView`, including recommended landmark wrappers and guidance for `emptyState`/error handling.
2. Expose error rendering hooks or props so components can present screen-reader friendly feedback when fetches fail.
3. Consider decomposing `ResourceDataView` into smaller composable primitives to reduce prop overload and ease custom layouts.
4. Add dev-mode warnings when identifier inference falls back to `item.id` to help developers surface resource config issues early.

## Phased Work Plan

### Phase 0 – Synchronise with Global Contracts

- Adopt the shared error taxonomy and lifecycle constants from the kernel to drive UI state messaging and async boundaries.
- Update UI documentation to reflect the monorepo accessibility contract, including expectations for semantic wrappers and observability hooks.
- Ensure provider/runtime code surfaces the shared namespace helpers so UI integrations validate configuration consistently with other packages.

### Phase 1 – Decompose & Expose Headless Primitives

- Break `ResourceDataView` into headless controllers and presentational components that rely on the shared contracts for state and error handling.
- Export hooks/components that mirror the kernel lifecycle constants, enabling other design systems to reuse the logic without DOM coupling.
- Introduce dev-mode warnings and instrumentation powered by the shared middleware/events published by the kernel.

### Phase 2 – Deliver Accessible Defaults

- Provide default `emptyState` and `errorState` slots that leverage WordPress components with ARIA-friendly semantics, aligned with cross-package reporter messaging.
- Document recommended landmark wrappers and include examples that demonstrate compliance with the shared accessibility guidelines.
- Add automated tests (axe + interaction) that assert the shared contracts remain intact when consumers override slots or mount the provider in micro-frontend environments.
