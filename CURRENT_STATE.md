## Quick orientation: packages and roles

- packages/kernel - Core runtime: actions, resources, data integration, policy, reporter, namespace, http, error types.
- packages/ui - React hooks and small helpers that depend on `@wordpress/data` (useAction, usePolicy, resource hooks, prefetch helpers).
- packages/e2e-utils - End-to-end test helpers and fixtures.
- packages/cli - CLI stubs (future).
- app/showcase - Example plugin demonstrating real usage (not exhaustively read here).

Now I’ll walk package-by-package and list public exports (hooks + APIs), runtime globals, and how authors use them.

---

## packages/kernel (Core framework)

Public surface (from index.ts):

- Namespaces:
    - `export * as http from './http'`
    - `export * as resource from './resource'`
    - `export * as error from './error'`
    - `export * as namespace from './namespace'`
    - `export * as actions from './actions'`
    - `export * as policy from './policy'`
    - `export * as data from './data'`
    - `export * as reporter from './reporter'`
- Flat convenience exports:
    - `defineResource<T = unknown, TQuery = unknown>(config: ResourceConfig<T, TQuery>): ResourceObject<T, TQuery>` - resource contract (returns a ResourceObject)
    - `createStore<T, TQuery = unknown>(config: ResourceStoreConfig<T, TQuery>): ResourceStore<T, TQuery>` - resource store factory (store descriptor)
    - `defineAction<TArgs = void, TResult = void>(actionName: string, fn: ActionFn<TArgs, TResult>, options?: ActionOptions): DefinedAction<TArgs, TResult>` - action authoring
    - `createActionMiddleware(): ReduxMiddleware`, `invokeAction<TArgs, TResult>(action: DefinedAction<TArgs, TResult>, args: TArgs, meta?: Record<string, unknown>): ActionEnvelope<TArgs, TResult>`, `EXECUTE_ACTION_TYPE` (string constant) - action middleware API
        - **data** (`packages/kernel/src/data/`)
- `configureKernel(config: ConfigureKernelOptions): KernelInstance`, `registerKernelStore<Key extends string, State, Actions, Selectors>(key: Key, config: Parameters<typeof createReduxStore>[1]): ReturnType<typeof createReduxStore>` - WordPress Data Integration with two layers: 1) Registry integration (`kernelEventsPlugin` bridges errors → `core/notices`, enables ecosystem extensibility via `wp.hooks`) - recommended for production, and 2) Redux middleware (action dispatch via `invokeAction()`) - only needed when using `useAction()` hook
    - `createReporter(options?: ReporterOptions): Reporter`, `createNoopReporter(): Reporter` - reporter factory
    - `createPolicyProxy<K>(): PolicyHelpers<K>`, `definePolicy<K>(map: PolicyMap<K>, opts?: PolicyOptions): PolicyHelpers<K>` - policy runtime (note: `usePolicy` is provided by the UI package)
    - `getWPData(): unknown | undefined` global helper (`globalThis.getWPData`)
    - **API functions**:
    - `getNamespace(explicit?: string): string` - get current namespace for scoping (used internally by defineResource, definePolicy, optional configureKernel Redux middleware)
    - `detectNamespace(options?: NamespaceDetectionOptions): NamespaceDetectionResult` - auto-detect namespace from plugin headers/package.json
    - `fetch<T>(request: TransportRequest): Promise<TransportResponse<T>>` - WordPress REST API fetch with error normalization and event emission
    - `interpolatePath(template: string, params: PathParams): string` - replace :param placeholders in REST paths (e.g., '/things/:id' → '/things/123')
    - Error classes: `KernelError`, `TransportError`, `ServerError`
    - Other helpers: `invalidate(patterns: CacheKeyPattern | CacheKeyPattern[], options?: InvalidateOptions): void`

Key modules and hooks:

- Actions:
    - `defineAction<TArgs = void, TResult = void>(actionName, fn, options)`: create actions with built-in lifecycle events, policy enforcement, cache invalidation, job scheduling hooks, and error normalization.
    - Action lifecycle: `wpk.action.start/complete/error` emitted via hooks & kernelEventsPlugin.
    - `createActionMiddleware(): ReduxMiddleware` - Redux-compatible middleware that intercepts kernel action envelopes and executes the underlying action; when an envelope is intercepted the middleware returns the action's Promise result.
    - `invokeAction<TArgs, TResult>(action: DefinedAction<TArgs, TResult>, args: TArgs, meta?: Record<string, unknown>): ActionEnvelope<TArgs, TResult>` - wraps a kernel action and its args into an envelope for dispatch through Redux/@wordpress/data; the action middleware recognizes and executes these envelopes.
    - Important for authors: action functions can be called directly or dispatched through stores.

- Resources:
    - `defineResource<T = unknown, TQuery = unknown>(config)`: central designer API - one resource definition yields client methods, store descriptor, cache keys, events, prefetch helpers, and grouped API.
    - Resource store descriptor (`createStore<T, TQuery = unknown>`): reducer, actions (plain actions to mutate store), selectors, resolvers (generator-style), controls.
    - Lazy store registration: `defineResource()` lazily registers with `wp.data.createReduxStore(storeKey, descriptor)` when `window.wp.data` is present. Hooks are attached lazily too.

- Data integration (WordPress Data Integration):
- `configureKernel(config: ConfigureKernelOptions): KernelInstance` - WordPress Data Integration with two distinct layers: 1. **Registry Integration** (recommended): `kernelEventsPlugin` bridges action errors to `core/notices` store, connects lifecycle events to `wp.hooks` for ecosystem extensibility, integrates reporter for centralized observability 2. **Redux Middleware** (optional): `createActionMiddleware` enables Redux dispatch via action envelopes - only needed when using `useAction()` React hook - Injects kernel action middleware and kernel event plugin via `registry.__experimentalUseMiddleware`. - Accepts `middleware?: ReduxMiddleware[]` and `reporter?: Reporter`. - Returns a teardown function to remove middleware/hook attachments. - **Note**: Resources auto-register stores with `wp.data` without needing `configureKernel()`. The bootstrap provides the extensibility and Redux dispatch layers.
    - `registerKernelStore<Key extends string, State, Actions, Selectors>(key: Key, config: Parameters<typeof createReduxStore<State, Actions, Selectors>>[1]): ReturnType<typeof createReduxStore>` - wrapper to create a Redux store descriptor and register it into `@wordpress/data`.

- Reporter:
    - `createReporter(options?: ReporterOptions): Reporter` - logging facility; used by action runtime & `kernelEventsPlugin` to send structured logs (returns a Reporter with info/debug/warn/error and child()).
    - `createNoopReporter(): Reporter` - returns a reporter with no-op methods (useful for tests/disabled telemetry).

- Policy:
    - `definePolicy<K>`, `createPolicyProxy<K>`, `createPolicyCache(options?: PolicyCacheOptions, namespace?: string): PolicyCache` - runtime for capability checks used by actions and `usePolicy<K>` (in UI).
    - Policy cache and helpers used by `usePolicy<K>` hook to provide reactive gating.

- Events plugin:
    - `kernelEventsPlugin(options: KernelEventsPluginOptions): KernelReduxMiddleware` - middleware that listens for lifecycle events and bridges them to `wp.hooks`, and forwards errors to `core/notices.createNotice` and the reporter.

Globals and runtime wiring:

- globalThis.getWPData() helper is provided for convenience.
- global.**WP_KERNEL_ACTION_RUNTIME** can be set to override runtime pieces (reporter, jobs, policy, bridge). The UI and action runtime use this to get policy/reporting backing.
- UI runtime wiring now relies on the kernel event bus instead of globals:
    - Resource hooks subscribe to `kernel.events` (`resource:defined`) and replay the kernel registry via `getRegisteredResources()`.
    - `useAction()` lazily registers the `wp-kernel/ui/actions` store and resolves the dispatcher directly from the WordPress data registry-no global caching or queueing remains.

Developer expectations:

- Call `defineResource()` to declare resource - stores auto-register with `wp.data`, no middleware needed.
- Call `defineAction()` to create actions - work as direct function calls (`await CreatePost(args)`).
- **Recommended**: Call `configureKernel({ registry, ...options })` at bootstrap for registry integration (error → notices bridge, `wp.hooks` extensibility, reporter integration).
- **Required only for `useAction()` hook**: The Redux middleware layer enabled by `configureKernel()` allows action dispatch through stores via `invokeAction()` envelopes.
- Actions can be called directly (`await CreatePost(args)`) or dispatched through stores when using `useAction()` hook.

---

## packages/ui (UI hooks)

Public surface (from index.ts):

- VERSION
- `usePolicy<K extends Record<string, unknown>>(): UsePolicyResult<K>`
- `attachResourceHooks`, `type UseResourceItemResult`, `type UseResourceListResult`
- `usePrefetcher<TRecord, TQuery>(): Prefetcher<TQuery>`, `useHoverPrefetch(ref, fn, options): void`, `useVisiblePrefetch(ref, fn, options): void`, `useNextPagePrefetch<TRecord, TQuery>(resource, currentQuery, options): void`
- `useAction<TInput, TResult>(): UseActionResult<TInput, TResult>`

Detailed hook behaviors:

- `attachResourceHooks(resource)`
    - `attachResourceHooks<T, TQuery>(resource: ResourceObject<T, TQuery>)`
    - Attaches `useGet` and `useList` hooks to a `ResourceObject`. This is called automatically by the UI package if resources were defined before UI loads (via pending queue).

    - `useGet<T>` / `useList<T, TQuery>` (created by `attachResourceHooks<T, TQuery>` and exported indirectly)
    - `useGet<T>(id: string | number): UseResourceItemResult<T>` - returns `{ data, isLoading, error }`.
    - `useList<T, TQuery>(query?: TQuery): UseResourceListResult<T>` - returns `{ data, isLoading, error }`.
    - Internally calls `wp.data.useSelect()` and triggers lazy registration of the resource store (`void resource.store`).

    - `useAction<TInput, TResult>(action: DefinedAction<TInput, TResult>, options?: UseActionOptions<TInput, TResult>): UseActionResult<TInput, TResult>`
    - Hook wrapper for invoking actions from React components:
        - Manages concurrency modes (parallel, switch, queue, drop).
        - Deduping, auto-invalidate result-based cache invalidation.
        - Internally registers a tiny in-plugin `wp-kernel/ui/actions` store using `registerKernelStore()` and resolves dispatch via `wp.data.dispatch('wp-kernel/ui/actions').invoke`, so it can use the same invoke/dispatch bridge as store dispatch.
        - Exposes run/cancel/reset and maintains local state for status/result/error.

    - `usePolicy<K extends Record<string, unknown>>(): UsePolicyResult<K>`
    - Wraps the policy runtime and exposes `can(key, ...params)`, `keys`, `isLoading`, `error`.
    - Uses global runtime `globalThis.__WP_KERNEL_ACTION_RUNTIME__?.policy`.

- Prefetch hooks:
    - `usePrefetcher<TRecord, TQuery = unknown>(resource: ResourceObject<TRecord, TQuery>): Prefetcher<TQuery>` - returns stable `prefetchGet` / `prefetchList` callbacks.
    - `useHoverPrefetch(ref: RefObject<HTMLElement>, fn: () => void, options?: HoverPrefetchOptions): void` - trigger `fn` on hover (with debounce and once options).
    - `useVisiblePrefetch(ref: RefObject<Element>, fn: () => void, options?: VisiblePrefetchOptions): void` - trigger `fn` when element becomes visible (IntersectionObserver / fallback).
    - `useNextPagePrefetch<TRecord, TQuery extends Record<string, unknown>>(resource: ResourceObject<TRecord, TQuery>, currentQuery: TQuery, options?: NextPagePrefetchOptions<TQuery>): void` - prefetch next page based on `currentQuery`.

Takeaway for authors:

- To use React hooks (`useGet`, `useList`, `usePolicy`), ensure the UI bundle is loaded - no bootstrap required.
- To use `useAction()` hook for Redux dispatch, call `configureKernel({ registry })` at bootstrap.
- `useAction` is the recommended UI-level API for dispatching kernel actions with lifecycle states and concurrency control.
- `usePolicy` keeps UI capability checks consistent with action policy enforcement.

---

## packages/e2e-utils (testing)

Exports:

- { test, expect } from './test' - wrappers for Playwright/Jest fixtures integrated for kernel tests.
- `createKernelUtils()` - factories to create resource helpers, store utils for E2E tests.
- Types: WordPressFixtures, ResourceConfig, etc.

What authors/testers use:

- Directly import `{ test, expect }` and use the annotation functions to write tests with full kernel integration based on `createKernelUtils`
- Use `createKernelUtils` in tests to setup test data, simulate registry, or assert event flows. E2E utilities are validated via the showcase e2e tests and are not intended to be unit-tested alone.

---

## packages/cli

- Stubbed out; no hooks currently. Future scaffolding & generators planned.

---

## Other internal hooks and utilities (across kernel + ui)

- `getWPData` (global helper) - convenience to access `window.wp.data`.
- registry-level plugin hooks:
    - `registry.__experimentalUseMiddleware` - used by `configureKernel` to append middleware.
    - A possible future `registry.__experimentalUseEnhancer` would allow enhancers, but not present now.

---

## Common author workflows (patterns)

### Minimal approach (without `configureKernel()`)

**What works standalone:**

- Define resources using `defineResource<T = unknown, TQuery = unknown>()` - stores auto-register with `wp.data`
- Use `defineAction<TArgs = void, TResult = void>()` for write flows - call actions directly as functions: `await CreatePost(args)`
- In React, use `useGet<T>`/`useList<T, TQuery>` hooks - work with auto-registered stores
- Define policies via `definePolicy()` - capability checks work in actions

**What you DON'T get without `configureKernel()`:**

- ✗ No automatic error → notices bridge (errors stay in console/manual handling)
- ✗ No ecosystem extensibility (lifecycle events don't bridge to `wp.hooks` for 3rd-party plugins)
- ✗ No centralized reporter integration
- ✗ Cannot use `useAction()` React hook (requires Redux middleware)

**Example:**

```typescript
// Resources work standalone
const Posts = defineResource({ name: 'posts', routes: { get: '/wp/v2/posts/:id' } });

// Actions work as direct function calls
const CreatePost = defineAction('CreatePost', async (args, ctx) => {
  const result = await Posts.create(args);
  ctx.invalidate(['posts:list']);
  return result;
});

// In React components
function PostList() {
  const { data } = Posts.useList(); // Works without configureKernel

  async function handleCreate(formData) {
    try {
      await CreatePost(formData); // Direct call - no Redux
      // Manual error handling required
    } catch (error) {
      // No automatic notices - must handle manually
      console.error(error);
    }
  }

  return <form onSubmit={handleCreate}>...</form>;
}
```

### Recommended approach (with `configureKernel()`)

**Registry Integration Layer (Recommended for all production plugins):**

1. **Plugin bootstrap with ecosystem integration**

    ```typescript
    import { configureKernel } from '@geekist/wp-kernel';

    // Enable registry integration at bootstrap
    const kernel = configureKernel({
    	registry: window.wp.data,
    	namespace: 'my-plugin',
    	reporter: createReporter({ level: 'debug' }),
    });
    ```

    **Benefits:**
    - ✓ Automatic error → `core/notices` bridge (structured notice mapping)
    - ✓ Lifecycle events bridge to `wp.hooks` (3rd-party plugins can listen)
    - ✓ Centralized observability via reporter
    - ✓ Ecosystem extensibility (other plugins can react to your events)

2. **Full-featured plugin bootstrap (with Redux middleware for `useAction()` hook)**

    ```typescript
    // Same as above, but now also enables useAction() hook
    const kernel = configureKernel({
    	registry: window.wp.data,
    	namespace: 'my-plugin',
    	reporter: createReporter({ level: 'debug' }),
    	middleware: [myCustomMiddleware], // Optional
    });

    // Define resources - stores still auto-register
    const Posts = defineResource<Post, PostQuery>({
    	name: 'posts',
    	routes: { get: '/wp/v2/posts/:id', list: '/wp/v2/posts' },
    });

    // Define actions - work as direct calls OR Redux dispatch
    const CreatePost = defineAction('CreatePost', async (args, ctx) => {
    	const result = await Posts.create(args);
    	ctx.invalidate(['posts:list']);
    	ctx.emit('post.created', { id: result.id });
    	return result;
    });
    ```

    **In React components:**

    ```typescript
    function PostList() {
      const { data } = Posts.useList(); // Works with auto-registered store

      // Option 1: useAction() hook (requires Redux middleware from configureKernel)
      const { run, status, error } = useAction(CreatePost);

      async function handleCreate(formData) {
        await run(formData);
        // Automatic error → notices via kernelEventsPlugin
        // No manual error handling needed
      }

      return (
        <form onSubmit={handleCreate}>
          {status === 'loading' && <Spinner />}
          {error && <Notice status="error">{error.message}</Notice>}
          ...
        </form>
      );
    }
    ```

3. **Hook wiring & custom middleware**
    - Call `configureKernel()` early in bootstrap to enable kernel middleware and `kernelEventsPlugin`
    - Pass `middleware: [myMiddleware]` to add host middleware (note: runs after kernel action middleware)

4. **Store registration (optional advanced)**
    - Call `registerKernelStore(key, descriptor)` if you want to register custom WP Data stores beyond resources

5. **Policy & capabilities**
    - Define policy rules via `definePolicy()` and use `usePolicy<K extends Record<string, unknown>>()` in UI to gate controls

6. **Reporting/logging**
    - Provide a custom reporter via `configureKernel({ registry, reporter: createReporter() })` to route logs to your telemetry

---

## Important behavioral nuances and gotchas

- Middleware ordering: host-provided middleware runs after kernel action middleware. This is deliberate to ensure action middleware executes envelopes first. If you need to observe envelopes, add instrumentation in `createActionMiddleware()` or adjust the ordering passed to `configureKernel()`.
- Lazy registration: resource stores & UI hooks are lazily registered/attached. Pre-importing resources before UI loads is supported via pending queue + global attach function.
- Envelopes vs. direct calls: Actions can be invoked directly (call function) or dispatched via store (invoke envelope). Middleware intercepts envelopes; direct calls bypass middleware and execute the function.
- Globals:
    - `global.__WP_KERNEL_ACTION_RUNTIME__` can override runtime services. UI `usePolicy<K extends Record<string, unknown>>()` reads from it.
    - UI attaches dispatch bridge with `registerKernelStore('wp-kernel/ui/actions', ...)` and caches a global dispatch resolver for `useAction<TInput, TResult>()` to call.
