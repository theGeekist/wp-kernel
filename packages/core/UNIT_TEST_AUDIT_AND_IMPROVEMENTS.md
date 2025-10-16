# Core Test Audit – Harness Consolidation

## Coverage Snapshot

- `pnpm --filter @wpkernel/core test:coverage` → 97.68% statements, 91.42% branches, 99.42% functions, 97.72% lines.【b448a2†L1-L45】

## Current Test Surface Highlights

- **WordPress data harness** – `createResourceDataHarness()` now provisions typed `dispatch`, `select`, `register`, `createReduxStore`, and `resolveSelect` mocks so suites can opt into a consistent `wp.data` façade without duplicating scaffolding.【F:packages/core/tests/resource.test-support.ts†L1-L210】
- **WordPress globals scoping** – `withWordPressData()` scopes `window.wp` overrides for cache and definition suites, eliminating bespoke delete/restore blocks while guaranteeing teardown symmetry in each spec.【F:packages/core/tests/resource.test-support.ts†L285-L318】【F:packages/core/src/resource/**tests**/define-prefetch.test.ts†L11-L64】【F:packages/core/src/resource/**tests**/cache/invalidate.test.ts†L8-L167】
- **API fetch harness** – `createApiFetchHarness()` provisions `apiFetch` and hook spies via the shared WordPress harness so client and transport tests can assert error channels without duplicating setup plumbing.【F:packages/core/tests/resource.test-support.ts†L320-L346】【F:packages/core/src/http/**tests**/fetch.test.ts†L1-L210】【F:packages/core/src/resource/**tests**/client.test.ts†L5-L220】
- **Resource prefetch suites** – `define-prefetch.test.ts` bootstraps the shared harness, tears down globals when asserting missing `wp.data`, and reuses the same fixture for happy-path and guard clauses, reducing bespoke setup while preserving the legacy error expectations.【F:packages/core/src/resource/**tests**/define-prefetch.test.ts†L7-L200】
- **Cache invalidation coverage** – The invalidate, invalidate-all, and edge-case suites now install the harness with overrideable dispatch/select mocks, keeping resolver assertions and reporter expectations while avoiding manual global bookkeeping.【F:packages/core/src/resource/**tests**/cache/invalidate.test.ts†L6-L118】【F:packages/core/src/resource/**tests**/cache/invalidate-all.test.ts†L6-L82】【F:packages/core/src/resource/**tests**/cache/edge-cases.test.ts†L29-L160】
- **Client transport exercises** – The client API spec wires `createWordPressTestHarness()` for `apiFetch` and hook spies so transport assertions run against the canonical mock surface rather than ad-hoc `window.wp` shims.【F:packages/core/src/resource/**tests**/client.test.ts†L5-L160】
- **Grouped API regression guard** – The grouped-store API suite leans on the harness to simulate resolver behavior, letting the table-driven expectations cover real selector fallbacks without permanent global mutations.【F:packages/core/src/resource/**tests**/store/grouped-api.test.ts†L7-L157】

## Risks & Opportunities

- **Ad-hoc CommonJS require** – The grouped API suite still falls back to `require('../../define')` to avoid circular imports when instantiating a real resource for regression checks. Converting this to an ESM-safe helper would tighten module boundaries and remove the lint suppression.【F:packages/core/src/resource/**tests**/store/grouped-api.test.ts†L57-L86】
- **Hooks passthrough ergonomics** – `createApiFetchHarness()` wraps hook overrides in jest mocks; if future tests need the raw WordPress hook signatures, an explicit type-safe adapter could make the relationship clearer.【F:packages/core/tests/wp-environment.test-support.ts†L207-L346】

## Recommended Follow-Ups

- Replace the remaining `require()` usage in grouped API tests with an ESM-compatible helper exported from the resource module to keep linting and module resolution uniform.【F:packages/core/src/resource/**tests**/store/grouped-api.test.ts†L57-L86】
