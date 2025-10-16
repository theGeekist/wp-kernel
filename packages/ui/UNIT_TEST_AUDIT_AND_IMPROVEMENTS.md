# Unit Test Audit & Improvement Plan

## Key Observations

- Hook suites such as `useAction` reimplement runtime factories, React wrappers, and WordPress data stubs inline, leading to lengthy boilerplate and inconsistent defaults between files.【F:packages/ui/src/hooks/**tests**/useAction.test.tsx†L27-L122】
- Tests mute console errors and manually clear symbol markers to keep shared globals stable, signalling missing lifecycle utilities for resetting Kernel UI state.【F:packages/ui/src/hooks/**tests**/useAction.test.tsx†L124-L155】
- Visibility/prefetch hooks construct custom DOM harnesses and override browser APIs (`IntersectionObserver`, `requestAnimationFrame`) per spec, duplicating scaffolding that could live in a shared helper.【F:packages/ui/src/hooks/**tests**/useVisiblePrefetch.test.tsx†L17-L198】
- Many hook tests focus on happy-path resource mocks without table-driven scenarios for error propagation, pending states, or multi-resource orchestration, making it harder to extend behaviour safely.

## Actionable Improvements

1. Build a `createKernelUITestHarness()` inside `src/hooks/testing` that returns provider wrappers, mock reporters, and WordPress data registration helpers; rewrite hook specs to call into it instead of redefining `createRuntime`/`renderUseActionHook` locally.【F:packages/ui/src/hooks/**tests**/useAction.test.tsx†L27-L122】
2. Export reset utilities (e.g., `resetActionStoreRegistration`, `restoreConsole`) from the harness so global clean-up happens in shared `beforeEach`/`afterEach`, removing the need for per-file console monkeypatching.【F:packages/ui/src/hooks/**tests**/useAction.test.tsx†L124-L155】
3. Factor out a DOM interaction helper (e.g., `withIntersectionObserverMock`) that provisions observers, raf stubs, and cleanup hooks, so visibility-related specs share consistent behaviour and reduce manual event wiring.【F:packages/ui/src/hooks/**tests**/useVisiblePrefetch.test.tsx†L17-L198】
4. Introduce `describe.each` tables for hook states (idle/loading/error/success) and extend resource fixtures with failure modes so we cover asynchronous edge cases without expanding single-case tests into sprawling blocks.
