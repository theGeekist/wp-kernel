# Unit Test Audit & Improvement Plan

## Key Observations

- Integration suites repeatedly stub `window.wp` objects, duplicating `apiFetch`, `hooks.doAction`, and data store mocks across files, which increases maintenance cost when WordPress APIs change.【F:packages/core/src/**tests**/integration/action-flow.test.ts†L26-L52】【F:packages/core/src/**tests**/integration/resource-flow.test.ts†L23-L71】
- Several tests mutate globals (e.g., `__WP_KERNEL_ACTION_RUNTIME__`) to inject policies or background job state, creating hidden coupling between cases and requiring manual cleanup.【F:packages/core/src/**tests**/integration/action-flow.test.ts†L165-L188】
- Cache invalidation coverage exercises real `@wordpress/data` stores and includes conditional skips to accommodate missing resolver hooks, signalling an unreliable fixture surface and slow execution path.【F:packages/core/src/**tests**/integration/cache-invalidation.test.ts†L29-L136】
- Build verification suites focus on high-level flows but lack targeted assertions for edge cases like concurrent invalidations or transport retry semantics, making regressions hard to localise (no dedicated unit focus beyond integration harness).

## Actionable Improvements

1. Extract a shared `createWordPressTestHarness()` in `src/__tests__/helpers/wp-environment.ts` to centralise `window.wp` bootstrapping, returning typed mocks for `apiFetch`, `data`, and `hooks`. Update integration suites to consume the helper and surface explicit teardown via `afterEach`, reducing repetition and drift.【F:packages/core/src/**tests**/integration/action-flow.test.ts†L26-L52】【F:packages/core/src/**tests**/integration/resource-flow.test.ts†L23-L71】
2. Replace ad-hoc global mutation with scoped helpers such as `withActionRuntimeOverrides({ policy })`, implemented via `jest.spyOn`/`jest.replaceProperty`, to ensure overrides are reset automatically after each test case.【F:packages/core/src/**tests**/integration/action-flow.test.ts†L165-L188】
3. Introduce lightweight unit specs for cache helper modules (`resource/cache`, invalidation queues) using synthetic stores so integration tests can narrow their responsibility to orchestration, trimming reliance on conditional guards.【F:packages/core/src/**tests**/integration/cache-invalidation.test.ts†L29-L136】
4. Add scenario matrices with `describe.each` for resource/action flows to cover retries, policy failures, and cross-tab scoping independently. This reduces the need for monolithic tests and makes it easier to add new behaviours without duplicating boilerplate setups.
