# Resource Store Identifier Strategy – Specification

**Version:** 0.4.1
**Status:** Draft (pre-implementation)  
**Date:** 2025-02-14  
**Sprint:** Pre-CLI Phase 0 alignment

---

## 1. Problem & Goal

**Problem Statement**

- `createStore()` hardcodes `(item) => item.id`, breaking when APIs return `uuid`, `slug`, or other identifier fields.
- `defineResource()` exposes no configuration for store indexing/query keys.
- Utilities, tests, and docs assume numeric IDs, making slug/UUID workflows brittle.

**Goal**
Enable resource definitions to declare their identifier strategy (ID extraction + query key generation) while keeping runtime behaviour backward-compatible and thoroughly documented.

---

## 2. Desired Outcomes (Definition of Done)

### Runtime Typing & Validation

- `ResourceConfig` accepts an optional `store` block with `getId`, `getQueryKey`, and `initialState`.
- `validateConfig()` rejects non-function `store` hooks with explicit `KernelError` diagnostics.
- `defineResource()` forwards `store` options to `createStore()` without altering existing defaults.
- Reporter emits warnings when `getId` returns `undefined` or produces duplicate keys.

### Store Behaviour & Testing

- Unit tests cover resources indexed by UUIDs and slugs, verifying selectors, resolvers, and cache keys.
- Integration tests ensure list resolvers handle custom identifiers without collisions or stale cache entries.
- TypeScript checks confirm `store` options are optional and preserve inference for existing resources.

### E2E Utilities

- `createKernelUtils` helpers accept `string | number` identifiers end-to-end (seed, remove, deleteAll).
- Tests demonstrate slug-based workflows using updated helpers.

### Documentation & Changelog

- `packages/kernel/README.md` documents custom identifier usage with examples.
- `docs/packages/kernel.md` mirrors README updates and links to this spec.
- Changelog entry summarises the enhancement and its non-breaking nature.

### Quality Gates

- `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:tests`, and `pnpm test` pass after changes.
- No reduction in existing coverage thresholds; new tests counted in reports.

---

## 3. Current Behaviour & Gaps (Context)

| Layer              | Behaviour Today                                            | Gap                                                                        |
| ------------------ | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| `createStore()`    | Uses `(item) => item.id` and `JSON.stringify(query)`       | Cannot index by `uuid`, `slug`, etc.; query key strategy not configurable. |
| `defineResource()` | Does not expose store options                              | Callers cannot pass `getId`, `getQueryKey`, or `initialState`.             |
| Typings            | `ResourceConfig` lacks store configuration shape           | No type-safe way to describe identifier strategy.                          |
| Validation         | No guardrails for the new `store` property                 | Risk of silent misuse (non-function values).                               |
| Tests              | Unit tests assume numeric IDs; E2E utils hard-code numbers | Fails for slug/UUID-backed resources.                                      |
| Documentation      | README + docs imply numeric IDs                            | Needs clarification and examples.                                          |

---

## 4. Solution Overview (Actionable Detail)

### 4.1 `ResourceConfig` Additions

Add an optional `store` block to the runtime `ResourceConfig` type:

```ts
type ResourceStoreOptions<T, TQuery> = {
	getId?: (item: T) => string | number;
	getQueryKey?: (query?: TQuery) => string;
	initialState?: Partial<ResourceState<T>>;
};

type ResourceConfig<T, TQuery> = {
	// existing fields ...
	store?: ResourceStoreOptions<T, TQuery>;
};
```

- Defaults mirror current behaviour.
- Runtime validation ensures any provided hooks are functions.
- `ResourceState` remains keyed by `string | number`, keeping compatibility with slug/UUID identifiers.

### 4.2 `defineResource()` Integration

- Forward `config.store` options into `createStore()`:
    ```ts
    const storeDescriptor = createStore({
    	resource,
    	reporter,
    	...config.store,
    });
    ```
- Preserve lazy registration semantics and reporter instrumentation.
- Ensure cache invalidation continues to receive the canonical store descriptor.

### 4.3 Store Implementation Updates

- `createStore()` already accepts `getId`, `getQueryKey`, and `initialState`; no behavioural changes required.
- Add defensive logging when `getId` returns `undefined` or duplicate keys to aid debugging.
- Verify cache invalidation concatenates identifiers via `String()` to avoid `[object Object]`.

### 4.4 E2E & Utilities

- Update `@geekist/wp-kernel-e2e-utils` to accept custom identifier extractors and return typed identifiers (`string | number`).
- Provide helpers for slug/UUID seeding to avoid direct `:id` string replacement in test utilities.

### 4.5 Documentation

- README: introduce a “Custom identifier” subsection under Resources with slug/UUID examples.
- Docs (`docs/packages/kernel.md`): mirror the README changes and cross-link the spec.
- Add a troubleshooting note about mismatched identifiers and how to fix them via `store.getId`.

---

## 5. Impact Analysis

### 5.1 Modules & Files

- `packages/kernel/src/resource/types.ts` – extend `ResourceConfig`, add `ResourceStoreOptions` type.
- `packages/kernel/src/resource/define.ts` – forward store options into `createStore()`.
- `packages/kernel/src/resource/validation.ts` – allow `store` block, validate function types.
- `packages/kernel/src/resource/__tests__/define.test.ts` – add coverage for custom IDs and query keys.
- `packages/kernel/src/resource/__tests__/store/*` – add regression tests ensuring `getId`/`getQueryKey` override behaviour.
- `packages/e2e-utils/src/createKernelUtils.ts` + tests – accept `string | number` IDs, expose optional `identifier` helpers.
- Docs: `packages/kernel/README.md`, `docs/packages/kernel.md`, plus changelog entry once shipped.

### 5.2 Testing Strategy

- Unit: mock resource returning UUIDs, assert selectors and cache keys use the custom identifier.
- Store integration: ensure list resolver handles mixed identifier shapes without collisions.
- E2E utilities: update fixtures to seed/remove items using slugs to detect regressions.
- TypeScript: add compile-time tests (via `tsd` or existing harness) covering function signatures.

### 5.3 Compatibility & Risk

- Optional `store` block preserves existing behaviour; no runtime breaking change expected.
- Validation catches non-function overrides early, preventing silent runtime failures.
- Duplicate identifiers remain possible if custom `getId` is incorrect; add reporter warnings to aid debugging.

---

## 6. Implementation Plan (Phased)

1. **Runtime Types** – Introduce `ResourceStoreOptions` and update `ResourceConfig`.
2. **Validation** – Permit and validate the new `store` block.
3. **defineResource** – Pass options into `createStore`; add reporter warnings for duplicate keys.
4. **Tests** – Extend unit and integration coverage for slug/UUID scenarios.
5. **E2E Utils** – Allow non-numeric IDs in seeding/removal helpers.
6. **Docs** – Update README and docs packages with guidance and examples.
7. **Changelog** – record change once the feature lands.

Should merge only after `pnpm lint`, `pnpm typecheck`, `pnpm typecheck:tests`, and `pnpm test` pass locally to respect Definition of Done.

---

## 7. References

- `ResourceConfig-extension.md` – original analysis prompting this spec.
- `packages/kernel/src/resource/store.ts` – existing store factory with override hooks.
- `packages/e2e-utils/src/createKernelUtils.ts` – test helpers requiring identifier updates.
