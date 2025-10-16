# Unit Test Audit & Improvement Plan

## Key Observations

- Hook suites such as `useAction` reimplement runtime factories, React wrappers, and WordPress data stubs inline, leading to lengthy boilerplate and inconsistent defaults between files despite the global harness patterns already captured in `tests/test-utils/wp.test-support.ts`, the compatibility barrel `tests/test-utils/wp.ts`, and `tests/TEST_PATTERNS.md`.【F:packages/ui/src/hooks/**tests**/useAction.test.tsx†L27-L122】【F:tests/test-utils/wp.test-support.ts†L1-L115】【F:tests/test-utils/wp.ts†L1-L1】【F:tests/TEST_PATTERNS.md†L17-L78】
- Tests mute console errors and manually clear symbol markers to keep shared globals stable, signalling missing lifecycle utilities for resetting Kernel UI state even though `tests/TEST_PATTERNS.md` calls out shared teardown helpers that UI has not yet adopted.【F:packages/ui/src/hooks/**tests**/useAction.test.tsx†L124-L155】【F:tests/TEST_PATTERNS.md†L123-L166】
- Visibility/prefetch hooks construct custom DOM harnesses and override browser APIs (`IntersectionObserver`, `requestAnimationFrame`) per spec, duplicating scaffolding that could live in a shared helper.【F:packages/ui/src/hooks/**tests**/useVisiblePrefetch.test.tsx†L17-L198】
- Many hook tests focus on happy-path resource mocks without table-driven scenarios for error propagation, pending states, or multi-resource orchestration, making it harder to extend behaviour safely.

## Actionable Improvements

- [x] **Kernel UI harness extracted.** `tests/ui-harness.test-support.ts` wraps the repo-level WordPress helpers, exposes provider factories, and is documented for contributors so suites can import a single helper instead of re-implementing context setup.【F:packages/ui/tests/ui-harness.test-support.ts†L1-L131】【F:packages/ui/AGENTS.md†L10-L15】【F:packages/ui/README.md†L36-L40】
- [x] **Lifecycle reset helpers.** The harness exports `resetActionStoreRegistration`, console suppression toggles, and ships self-tests to ensure global cleanup happens in shared hooks without coverage penalties.【F:packages/ui/tests/ui-harness.test-support.ts†L47-L118】【F:packages/ui/tests/**tests**/ui-harness.test.ts†L1-L74】
- [x] **DOM observer utilities.** `tests/dom-observer.test-support.ts` centralises `IntersectionObserver`/`requestAnimationFrame` mocks with teardown automation so visibility suites align on one implementation.【F:packages/ui/tests/dom-observer.test-support.ts†L1-L168】
- [ ] **State matrices for hooks.** Expand hook suites with `describe.each` tables for idle/loading/error/success states and failure cases, leaning on the shared harness to avoid duplicated setup.【F:packages/ui/src/hooks/**tests**/useAction.test.tsx†L27-L155】
- [x] **Helper catalogue surfaced.** README/AGENT docs and `tests/TEST_PATTERNS.md` now call out the `.test-support.ts` helpers so new utilities ship with companion tests and consistent naming.【F:packages/ui/README.md†L36-L40】【F:packages/ui/AGENTS.md†L10-L15】【F:tests/TEST_PATTERNS.md†L1-L122】
