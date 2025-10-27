# WP Kernel - Current State (v2)

**Last Updated:** 27 October 2025
**Version:** 0.7.0 (monorepo snapshot)
**Status:** Core runtime stable; CLI Phases 0-3 complete (Phase 4 underway)

---

## Quick Orientation

WP Kernel is a Rails-like framework for WordPress where JavaScript is the source of truth and PHP is a thin contract. This document provides a comprehensive snapshot of public APIs, runtime integration patterns, and developer workflows, plus the CLI pipeline now responsible for config → IR → codegen → apply → watch.

### Package Roles

- **`@wpkernel/core`** - Core framework: actions, resources, data integration, policy, reporter, namespace detection, HTTP transport, error types, event bus
- **`@wpkernel/ui`** - React integration: hooks, runtime adapter, context provider for UI primitives
- **`@wpkernel/e2e-utils`** - End-to-end test helpers and fixtures for Playwright/Jest
- **`@wpkernel/cli`** - Authoring workflow: `loadWPKernelConfig`, deterministic IR builder, printers for TypeScript/PHP, adapter extension runner, commands (`generate`, `apply`, `dev`, placeholder `init`/`doctor`)
- **`examples/showcase`** - Example plugin demonstrating real-world usage (jobs & applications system)

---

## `@wpkernel/core` - Core Framework

### Namespace Exports

The kernel organizes exports by module for clear scoping:

```typescript
import {
	http,
	resource,
	error,
	namespace,
	actions,
	policy,
	data,
	reporter,
} from '@wpkernel/core';
```

- **`http`** - REST API transport (`fetch`)
- **`resource`** - Resource system (`defineResource`, cache helpers, store factory)
- **`error`** - Error classes (`WPKernelError`, `TransportError`, `ServerError`)
- **`namespace`** - Namespace detection and helpers
- **`actions`** - Action system (`defineAction`, middleware, invokeAction)
- **`policy`** - Policy runtime (`definePolicy`, proxy, cache)
- **`data`** - WordPress Data integration (`configureKernel`, `registerKernelStore`, `kernelEventsPlugin`)
- **`reporter`** - Logging infrastructure (`createReporter`, `createNoopReporter`)

### Flat Convenience Exports

For quick imports without namespace nesting:

**Core Primitives:**

- `defineResource<T, TQuery>(config: ResourceConfig<T, TQuery>): ResourceObject<T, TQuery>` - Define a resource with routes, cache keys, and store
- `defineAction<TArgs, TResult>(config: ActionConfig<TArgs, TResult>): DefinedAction<TArgs, TResult>` - Define an action with config object `{ name, handler, options }`
- `definePolicy<K>(config: PolicyDefinitionConfig<K>): PolicyHelpers<K>` - Define policy rules with config object `{ map, options }`

**HTTP Transport:**

- `fetch<T>(request: TransportRequest): Promise<TransportResponse<T>>` - WordPress REST API client with error normalization

**Resource Utilities:**

- `createStore<T, TQuery>(config: ResourceStoreConfig<T, TQuery>): ResourceStore<T, TQuery>` - Create WordPress Data store descriptor
- `invalidate(patterns: CacheKeyPattern | CacheKeyPattern[], options?: InvalidateOptions): void` - Invalidate resource caches
- `invalidateAll(options?: InvalidateOptions): void` - Clear all resource caches
- `interpolatePath(template: string, params: PathParams): string` - Replace `:param` placeholders in paths
- Cache key helpers: `normalizeCacheKey`, `matchesCacheKey`, `findMatchingKeys`, `findMatchingKeysMultiple`

**Action Middleware:**

- `createActionMiddleware(): ReduxMiddleware` - Redux middleware for action dispatch
- `invokeAction<TArgs, TResult>(action: DefinedAction<TArgs, TResult>, args: TArgs, meta?: Record<string, unknown>): ActionEnvelope<TArgs, TResult>` - Wrap action for Redux dispatch
- `EXECUTE_ACTION_TYPE: string` - Action type constant for middleware

**Error Classes:**

- `WPKernelError` - Base error with typed codes and structured context
- `TransportError` - HTTP/network errors with request/response data
- `ServerError` - Server-side errors (4xx/5xx) with WordPress error payload

**Namespace Helpers:**

- `detectNamespace(options?: NamespaceDetectionOptions): NamespaceDetectionResult` - Auto-detect from plugin headers/package.json
- `getNamespace(explicit?: string): string` - Get current namespace (used internally)
- `isValidNamespace(ns: string): boolean` - Validate namespace format
- `sanitizeNamespace(ns: string): string` - Clean namespace string
- `WPK_NAMESPACE`, `WPK_SUBSYSTEM_NAMESPACES`, `WPK_INFRASTRUCTURE`, `WPK_EVENTS` - Constants

**Reporter:**

- `createReporter(options?: ReporterOptions): Reporter` - Create structured logger
- `createNoopReporter(): Reporter` - No-op logger for tests

**Event Bus:**

- `KernelEventBus` - Class for typed event subscription/emission
- `getKernelEventBus(): KernelEventBus` - Get singleton event bus
- `setKernelEventBus(bus: KernelEventBus): void` - Override event bus (testing)
- `getRegisteredResources(): ResourceDefinedEvent[]` - Replay registered resources
- `getRegisteredActions(): ActionDefinedEvent[]` - Replay registered actions
- `clearRegisteredResources()`, `clearRegisteredActions()` - Testing helpers

**Global Helper:**

- `getWPData(): unknown | undefined` - Access `window.wp.data` safely (available globally via `globalThis.getWPData`)

---

### `configureKernel()` - Unified Bootstrap API

The canonical entry point for framework configuration. Call once at application bootstrap to wire registry middleware, event bridging, and optional UI integration.

**Signature:**

```typescript
configureKernel(config: ConfigureKernelOptions): KernelInstance
```

**Configuration Options:**

```typescript
interface KernelUIConfig {
	enable?: boolean; // Explicitly enable UI bindings (defaults to truthy attach)
	attach?: KernelUIAttach; // Adapter function (e.g., attachUIBindings)
	options?: UIIntegrationOptions; // Adapter-specific options
}

interface ConfigureKernelOptions {
	namespace?: string; // Plugin namespace (auto-detected if omitted)
	registry?: KernelRegistry; // WordPress Data registry (defaults to window.wp.data)
	reporter?: Reporter; // Custom reporter (defaults to createReporter)
	middleware?: ReduxMiddleware[]; // Additional Redux middleware
	ui?: KernelUIConfig; // Optional UI runtime integration
}
```

**Returns: `KernelInstance`**

A configured kernel instance exposing:

```typescript
interface KernelInstance {
	// Configuration accessors
	getNamespace(): string;
	getReporter(): Reporter;
	getRegistry(): KernelRegistry | undefined;

	// Cache management
	invalidate(
		patterns: CacheKeyPattern | CacheKeyPattern[],
		options?: InvalidateOptions
	): void;

	// Event emission
	emit(eventName: string, payload: unknown): void;

	// Lifecycle
	teardown(): void; // Remove middleware, listeners, cleanup

	// UI runtime integration
	hasUIRuntime(): boolean;
	getUIRuntime(): KernelUIRuntime | undefined;
	attachUIBindings(
		attach: KernelUIAttach,
		options?: UIIntegrationOptions
	): KernelUIRuntime;

	// UI configuration (compat)
	ui: {
		isEnabled(): boolean;
		options?: UIIntegrationOptions;
	};

	// Event bus
	events: KernelEventBus;

	// Resource helper (optional convenience)
	defineResource<T, TQuery>(
		config: ResourceConfig<T, TQuery>
	): ResourceObject<T, TQuery>;
}
```

**What It Does:**

1. **Registry Integration** (when `registry` provided):
    - Installs `createActionMiddleware()` for action dispatch envelopes
    - Installs `kernelEventsPlugin` for error → notices bridge and `wp.hooks` forwarding
    - Appends any custom middleware passed via `middleware` option

2. **Event Bus Setup:**
    - Initializes/reuses the singleton `KernelEventBus`
    - Subscribes `kernelEventsPlugin` to lifecycle events

3. **UI Runtime** (when `ui.attach` provided):
    - Calls the adapter function with the kernel instance
    - Stores the runtime for access via `kernel.getUIRuntime()`
    - Enables React hooks integration

4. **Cleanup:**
    - Returns teardown function via `kernel.teardown()` to remove middleware and listeners

**Basic Usage:**

```typescript
import { configureKernel } from '@wpkernel/core';

const kernel = configureKernel({
	namespace: 'my-plugin',
	registry: window.wp.data,
});

// Access configuration
const ns = kernel.getNamespace();

// Invalidate caches
kernel.invalidate(['posts', 'list']);

// Subscribe to events
kernel.events.on('action:complete', ({ actionName, result }) => {
	console.log(`Action ${actionName} completed`);
});

// Cleanup on unmount
kernel.teardown();
```

---

### `KernelEventBus` - Typed Event System

The framework emits lifecycle events through a typed event bus exposed as `kernel.events`. All events continue to bridge to `wp.hooks` for ecosystem compatibility while providing a typed JavaScript subscription surface.

**Event Types:**

```typescript
type KernelEventMap = {
	'resource:defined': { resource: ResourceObject; namespace: string };
	'action:defined': { action: DefinedAction; namespace: string };
	'action:start': ActionLifecycleEvent; // Before action execution
	'action:complete': ActionLifecycleEvent; // After successful execution
	'action:error': ActionLifecycleEvent; // On action failure
	'action:domain': {
		// Domain events via ctx.emit()
		eventName: string;
		payload: unknown;
		metadata: ActionLifecycleEventBase;
	};
	'cache:invalidated': {
		keys: string[];
		storeKey?: string;
	};
	'custom:event': {
		// Via kernel.emit()
		eventName: string;
		payload: unknown;
	};
};
```

**API:**

```typescript
// Subscribe to events
const unsubscribe = kernel.events.on('action:complete', (event) => {
	console.log(`Action ${event.actionName} took ${event.durationMs}ms`);
});

// Subscribe once
kernel.events.once('resource:defined', (event) => {
	console.log(`Resource ${event.resource.name} registered`);
});

// Unsubscribe
kernel.events.off('action:complete', handler);

// Or use returned function
unsubscribe();

// Emit custom events (advanced)
kernel.events.emit('custom:event', {
	eventName: 'my-plugin.thing.happened',
	payload: { id: 123 },
});
```

**Event Flow:**

1. **Internal emissions** - Resources, actions, and cache helpers emit lifecycle events
2. **Event bus propagation** - Events flow through `KernelEventBus` to all subscribers
3. **WordPress hooks bridge** - `kernelEventsPlugin` forwards events to `wp.hooks` (e.g., `wpk.action.complete`)
4. **BroadcastChannel** - Cross-tab events (when `scope: 'crossTab'`) propagate via BroadcastChannel API

**Common Patterns:**

```typescript
// React to resource definitions (used by UI runtime)
kernel.events.on('resource:defined', ({ resource }) => {
	attachResourceHooks(resource, runtime);
});

// Monitor action performance
kernel.events.on('action:complete', ({ actionName, durationMs }) => {
	if (durationMs > 1000) {
		console.warn(`Slow action: ${actionName} took ${durationMs}ms`);
	}
});

// Audit trail
kernel.events.on('action:start', (event) => {
	analytics.track('action.started', { name: event.actionName });
});
```

**Canonical Event Names:**

System events use the `wpk.*` prefix:

- `wpk.resource.created`, `wpk.resource.updated`, `wpk.resource.removed`, `wpk.resource.defined`
- `wpk.action.start`, `wpk.action.complete`, `wpk.action.error`, `wpk.action.defined`
- `wpk.cache.invalidated`
- `wpk.job.*` (planned), `wpk.policy.denied` (planned)

Domain events follow the pattern `{namespace}.{resource}.{verb}`:

- `my-plugin.post.created`, `my-plugin.comment.approved`, etc.

---

## `@wpkernel/ui` - React Integration

### Core Exports

**Runtime Integration:**

- `attachUIBindings: KernelUIAttach` - Adapter function for kernel integration
- `KernelUIProvider: React.FC<KernelUIProviderProps>` - Context provider for runtime
- `useKernelUI(): KernelUIRuntime` - Hook to access the UI runtime

**React Hooks:**

- `useAction<TInput, TResult>(action: DefinedAction<TInput, TResult>, options?: UseActionOptions): UseActionResult` - Action dispatcher with concurrency control
- `usePolicy<K>(): UsePolicyResult<K>` - Policy runtime access for capability checks
- `attachResourceHooks<T, TQuery>(resource: ResourceObject<T, TQuery>, runtime: KernelUIRuntime): void` - Attach `useGet`/`useList` to resources

**Prefetch Utilities:**

- `usePrefetcher<TRecord, TQuery>(resource: ResourceObject<TRecord, TQuery>): Prefetcher<TQuery>` - Stable prefetch callbacks
- `useHoverPrefetch(ref, fn, options): void` - Prefetch on hover
- `useVisiblePrefetch(ref, fn, options): void` - Prefetch when visible (IntersectionObserver)
- `useNextPagePrefetch<TRecord, TQuery>(resource, currentQuery, options): void` - Auto-prefetch next page

### Runtime Integration Pattern

The UI package uses an **adapter-driven architecture**. Instead of side-effect imports, you explicitly attach UI bindings through `configureKernel()`:

```typescript
// 1. Import adapter from UI package
import { attachUIBindings, KernelUIProvider } from '@wpkernel/ui';
import { configureKernel } from '@wpkernel/core';

// 2. Configure kernel with UI adapter
const kernel = configureKernel({
  registry: window.wp.data,
  namespace: 'my-plugin',
  ui: {
    attach: attachUIBindings,  // Pass adapter function
    options: { /* UI-specific options */ }
  }
});

// 3. Get the runtime
const runtime = kernel.getUIRuntime();

// 4. Wrap React tree with provider
import { createRoot } from '@wordpress/element';

createRoot(document.getElementById('root')).render(
  <KernelUIProvider runtime={runtime}>
    <App />
  </KernelUIProvider>
);
```

**Or attach manually after configuration:**

```typescript
const kernel = configureKernel({
	registry: window.wp.data,
	namespace: 'my-plugin',
});

// Later, when UI bundle loads
import { attachUIBindings } from '@wpkernel/ui';
const runtime = kernel.attachUIBindings(attachUIBindings);
```

### What the Adapter Does

`attachUIBindings()` creates a `KernelUIRuntime` that:

1. **Subscribes to `resource:defined` events** - Attaches `useGet`/`useList` hooks to resources as they're defined
2. **Replays existing resources** - Processes resources defined before UI loaded via `getRegisteredResources()`
3. **Provides shared services** - Reporter, namespace, registry, event bus, invalidation helper
4. **Resolves policy runtime** - Reads `globalThis.__WP_KERNEL_ACTION_RUNTIME__.policy` for capability checks

**Result:**

```typescript
interface KernelUIRuntime {
	kernel?: KernelInstance;
	namespace: string;
	reporter: Reporter;
	registry?: KernelRegistry;
	events: KernelEventBus;
	policies?: { policy: PolicyHelpers };
	invalidate?: (patterns, options) => void;
	options?: UIIntegrationOptions;
}
```

### Hook Usage

**Resource Hooks:**

Once attached, resources expose `useGet` and `useList`:

```typescript
const Posts = defineResource<Post, PostQuery>({
  name: 'posts',
  routes: { get: '/wp/v2/posts/:id', list: '/wp/v2/posts' }
});

function PostDetail({ id }) {
  const { data, isLoading, error } = Posts.useGet(id);

  if (isLoading) return <Spinner />;
  if (error) return <Notice status="error">{error.message}</Notice>;
  return <h1>{data.title}</h1>;
}

function PostList() {
  const { data, isLoading, error } = Posts.useList({ status: 'publish' });

  return data?.items.map(post => <PostCard key={post.id} post={post} />);
}
```

**Action Hook:**

`useAction` provides managed action dispatch with lifecycle states:

```typescript
const CreatePost = defineAction({
  name: 'Post.Create',
  handler: async (ctx, { data }) => {
    const post = await Posts.create!(data);
    ctx.invalidate([Posts.key('list')]);
    return post;
  }
});

function NewPostForm() {
  const { run, status, result, error, reset } = useAction(CreatePost, {
    concurrency: 'switch',  // or 'parallel', 'queue', 'drop'
    onSuccess: (post) => console.log('Created:', post),
    onError: (err) => console.error(err)
  });

  async function handleSubmit(formData) {
    await run({ data: formData });
  }

  return (
    <form onSubmit={handleSubmit}>
      {status === 'loading' && <Spinner />}
      {status === 'success' && <Notice>Post created!</Notice>}
      {error && <Notice status="error">{error.message}</Notice>}
      <button disabled={status === 'loading'}>Create Post</button>
    </form>
  );
}
```

**Policy Hook:**

```typescript
const policies = definePolicy({
  map: {
    'posts.create': () => wp.data.select('core').canUser('create', 'posts'),
    'posts.delete': (postId) => wp.data.select('core').canUser('delete', 'posts', postId)
  }
});

function PostActions({ postId }) {
  const policy = usePolicy();
  const canDelete = policy.can('posts.delete', postId);

  if (!canDelete) return null;
  return <button onClick={handleDelete}>Delete</button>;
}
```

### Requirements

- ✓ Call `configureKernel({ ui: { attach: attachUIBindings } })` at bootstrap
- ✓ Wrap React tree with `<KernelUIProvider runtime={kernel.getUIRuntime()} />`
- ✓ Hooks will throw `WPKernelError` if runtime is unavailable

---

## Other Packages

### `@wpkernel/e2e-utils`

E2E testing utilities for Playwright/Jest integration:

- `{ test, expect }` - Wrapped Playwright test fixtures with kernel integration
- `createKernelUtils(fixtures)` - Factory for resource helpers, store utilities, event monitoring
- Validated via showcase app E2E tests (not unit tested in isolation)

### `@wpkernel/cli`

Authoring workflow that turns `wpk.config.*` into generated TypeScript/PHP artifacts and keeps `inc/` in sync.

- **Config Loader (`loadWPKernelConfig`)** - cosmiconfig + TSX resolve TS/JS/JSON/`package.json#wpk`, enforce Typanion schema parity, composer autoload guard, surface typed `WPKernelError` diagnostics.
- **IR Builder (`buildIr`)** - deterministic `IRv1` carrying sanitised namespace, schema hashes, identity/storage metadata, policy hints, and printer directives.
- **Printers** - emit `.generated/types/**` and `.generated/php/**` with adapter `customise` hooks before Prettier formatting.
- **Adapter Extensions** - sandboxed pipeline (`adapter.extensions`) that can mutate IR and queue writes committed atomically after printers.
- **Commands**
    - `wpk generate [--dry-run] [--verbose]` - runs loader → IR → printers, summarises hash-based writes, exits 0/1/2/3 for success/validation/printer/adapter errors.
    - `wpk apply [--yes] [--backup] [--force]` - enforces clean `.generated/php`, merges `WPK:BEGIN/END AUTO` blocks, writes `.wpk-apply.log` audit entries with flags and per-file metadata.
    - `wpk start [--verbose] [--auto-apply-php]` - chokidar watch with fast/slow debounce tiers, queued triggers, optional best-effort PHP copy, and an embedded Vite dev server without implicit apply.
    - `wpk build [--no-apply] [--verbose]` - orchestrates `generate` → `pnpm exec vite build` → `apply --yes`, with `--no-apply` for inspection workflows.
    - `wpk init`, `wpk doctor` - placeholders slated for adapter/diagnostic work once Phase 7a/8 land.

### Kernel Config (`wpk.config.ts`)

The CLI treats `WPKernelConfigV1` as the single authoring surface:

```ts
interface WPKernelConfigV1 {
	version: 1;
	namespace: string;
	schemas: Record<string, SchemaConfig>;
	resources: Record<string, ResourceConfig>;
	adapters?: {
		php?: PhpAdapterFactory; // Custom namespace/autoload & printer customise hook
		extensions?: AdapterExtensionFactory[]; // Sandbox-queued file/IR mutations
	};
}
```

- `SchemaConfig` declares filesystem path and generated type target.
- `ResourceConfig` is the same structure consumed by `defineResource`, ensuring runtime parity.
- Adapter factories receive `AdapterContext { config, namespace, reporter, ir }`.
- `AdapterExtensionContext` exposes `queueFile`, `updateIr`, `formatPhp`, and `formatTs` helpers - all writes must stay under `.generated/**`.

---

## Developer Workflows

### Minimal Standalone Usage (No `configureKernel`)

The core primitives work without any bootstrap:

```typescript
import { defineResource, defineAction } from '@wpkernel/core';

// Resources auto-register stores with wp.data
const Posts = defineResource<Post>({
  name: 'posts',
  routes: { get: '/wp/v2/posts/:id', list: '/wp/v2/posts' }
});

// Actions work as plain async functions
const CreatePost = defineAction({
  name: 'Post.Create',
  handler: async (ctx, { data }) => {
    const post = await Posts.create!(data);
    ctx.invalidate([Posts.key('list')]);
    return post;
  }
});

// Direct function call - no Redux
await CreatePost({ data: { title: 'Hello', content: '...' } });

// In React (resource hooks work)
function PostList() {
  const { data } = Posts.useList();  // ✓ Works without configureKernel
  return data?.items.map(post => <PostCard key={post.id} post={post} />);
}
```

**Limitations:**

- ✗ No automatic error → `core/notices` bridge
- ✗ No lifecycle events bridging to `wp.hooks`
- ✗ No centralized reporter/observability
- ✗ Cannot use `useAction()` hook (requires Redux middleware)

---

### Recommended: Full Integration with `configureKernel`

Call `configureKernel()` at bootstrap for production-ready integration:

```typescript
import { configureKernel, defineResource, defineAction } from '@wpkernel/core';
import { attachUIBindings, KernelUIProvider, useAction } from '@wpkernel/ui';
import { createRoot } from '@wordpress/element';

// 1. Configure kernel with UI adapter
const kernel = configureKernel({
  registry: window.wp.data,
  namespace: 'my-plugin',
  reporter: createReporter({ level: 'debug' }),
  ui: { attach: attachUIBindings }
});

// 2. Define resources (stores auto-register)
const Posts = defineResource<Post, PostQuery>({
  name: 'posts',
  routes: {
    get: { path: '/wp/v2/posts/:id', method: 'GET' },
    list: { path: '/wp/v2/posts', method: 'GET' },
    create: { path: '/wp/v2/posts', method: 'POST' },
    update: { path: '/wp/v2/posts/:id', method: 'PUT' }
  }
});

// 3. Define actions with full orchestration
const CreatePost = defineAction({
  name: 'Post.Create',
  handler: async (ctx, { data }) => {
    // Policy check
    ctx.policy.assert('posts.create');

    // Resource call
    const post = await Posts.create!(data);

    // Emit domain event
    ctx.emit('my-plugin.post.created', { id: post.id, data: post });

    // Invalidate cache
    ctx.invalidate([Posts.key('list')]);

    // Queue background job (if implemented)
    // await ctx.jobs.enqueue('IndexPost', { postId: post.id });

    return post;
  },
  options: { scope: 'crossTab', bridged: true }
});

// 4. Mount React app with UI runtime
const runtime = kernel.getUIRuntime();

createRoot(document.getElementById('app')).render(
  <KernelUIProvider runtime={runtime}>
    <App />
  </KernelUIProvider>
);

// 5. Use hooks in components
function NewPostForm() {
  const { run, status, error } = useAction(CreatePost, {
    concurrency: 'switch',
    onSuccess: (post) => {
      // Automatic error → notices via kernelEventsPlugin
      // No manual error handling needed
      console.log('Created:', post.id);
    }
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      run({ data: new FormData(e.target) });
    }}>
      {status === 'loading' && <Spinner />}
      {error && <Notice status="error">{error.message}</Notice>}
      <input name="title" required />
      <textarea name="content" required />
      <button disabled={status === 'loading'}>Create</button>
    </form>
  );
}

function PostList() {
  const { data, isLoading, error } = Posts.useList({ status: 'publish' });

  if (isLoading) return <Spinner />;
  if (error) return <Notice status="error">{error.message}</Notice>;

  return data?.items.map(post => <PostCard key={post.id} post={post} />);
}
```

**Benefits:**

- ✓ Automatic error → `core/notices` mapping
- ✓ Lifecycle events bridge to `wp.hooks` for ecosystem extensibility
- ✓ Centralized logging via reporter
- ✓ `useAction()` hook with concurrency control and state management
- ✓ Resource hooks with type-safe selectors
- ✓ Policy-aware UI with `usePolicy()` hook

---

### CLI-Driven Authoring Workflow

1. **Edit** `wpk.config.ts`, resource definitions, or JSON Schemas.
2. **Generate**: `wpk generate [--dry-run]` runs loader → IR → printers. Inspect the SHA-256-based summary before committing.
3. **Commit** `.generated/**` to capture the canonical codegen state (required before apply).
4. **Apply**: `wpk apply [--backup][--force][--yes]` merges guarded PHP into `inc/**`, writes `.wpk-apply.log`, and enforces clean `.generated/php`.
5. **Watch** (optional): `wpk start [--auto-apply-php]` for chokidar-based regeneration during development.
6. **Tests**: Follow the repo policy - `pnpm lint --fix && pnpm typecheck && pnpm typecheck:tests && pnpm test`.
7. **Showcase parity**: Running generate/apply inside `examples/showcase` keeps the reference plugin aligned.
8. **Extensions**: Adapter factories can queue additional generated files or mutate IR; they run inside temp sandboxes and commit atomically after printers.

---

## Runtime Behavior & Implementation Details

### Global Runtime Override

`globalThis.__WP_KERNEL_ACTION_RUNTIME__` is an **escape hatch** for advanced runtime customization:

```typescript
interface ActionRuntime {
	reporter?: Reporter;
	jobs?: JobsRuntime;
	policy?: PolicyHelpers;
	bridge?: PHPBridge;
}
```

**Current Usage:**

- **Policy runtime** (`packages/core/src/policy/context.ts`) - Reads `policy` from this global
- **UI runtime** (`attachUIBindings`) - Reads `policy` to provide `usePolicy()` hook
- **Not used by actions** - Actions receive reporter/namespace via their execution context

**When to use:**

- Testing - inject mock policy/reporter/jobs
- Custom policy adapters - provide alternative capability checking
- Advanced integrations - replace default runtime services

**Example:**

```typescript
globalThis.__WP_KERNEL_ACTION_RUNTIME__ = {
	reporter: createReporter({ channel: 'custom', level: 'debug' }),
	policy: definePolicy({ map: customPolicyRules }),
	jobs: customJobsImplementation,
};
```

### Architecture Patterns

**Event-Driven Integration:**

- Resources emit `resource:defined` when `defineResource()` is called
- Actions emit `action:defined`, `action:start`, `action:complete`, `action:error`
- Cache helpers emit `cache:invalidated`
- UI runtime subscribes to `resource:defined` to attach hooks synchronously

**No Queues or Side Effects:**

- Phase 5 removed all `__WP_KERNEL_UI_*` globals
- No pending resource queue - hooks attach immediately via event subscription
- No cached action dispatcher - `useAction()` resolves dispatcher from registry on demand

**Lazy Store Registration:**

- Resources auto-register stores with `wp.data.createReduxStore()` when `window.wp.data` is available
- First access to `resource.store` triggers registration
- Resource hooks (useGet/useList) trigger registration automatically

**Middleware Ordering:**

- Kernel action middleware runs first (intercepts action envelopes)
- Custom middleware (from `configureKernel({ middleware })`) runs after
- This ensures envelopes are handled before custom logic

**Action Dispatch Modes:**

1. **Direct call** - `await CreatePost(args)` - Bypasses Redux, executes immediately
2. **Redux dispatch** - `store.dispatch(invokeAction(CreatePost, args))` - Goes through middleware
3. **useAction hook** - Wraps Redux dispatch with state management and concurrency control

### Namespace Behavior

- Auto-detected from plugin headers (PHP `Plugin Name:`) or `package.json` (`name` field)
- Sanitized to lowercase kebab-case
- Used for:
    - Store keys: `{namespace}/{resource-name}`
    - Cache keys: `{namespace}/{resource-name}/list?query`
    - Event names: `{namespace}.{resource}.{action}`
    - Reporter context

**Override:**

```typescript
const kernel = configureKernel({
	namespace: 'my-custom-namespace', // Explicit override
});
```

### Error Normalization

All errors become `WPKernelError` instances with:

- Typed error codes (`ValidationError`, `TransportError`, `ServerError`, etc.)
- Structured context (action name, request ID, resource, etc.)
- Preserved stack traces
- WordPress error payload mapping (PHP `WP_Error` → `WPKernelError`)

**Error Flow:**

1. Action throws error (any type)
2. Action runtime wraps in `WPKernelError` with context
3. `action:error` event emitted
4. `kernelEventsPlugin` forwards to `core/notices.createNotice()`
5. User sees structured error notice

### Cache Invalidation Scope

- `kernel.invalidate(patterns)` - Uses configured registry
- `ctx.invalidate(patterns)` - Uses action context registry
- Patterns match via glob/regex: `['posts', 'list']`, `['posts/*']`, `[/^posts\//]`
- Emits `cache:invalidated` event for observability

### Teardown & Cleanup

`kernel.teardown()`:

1. Calls all cleanup tasks in LIFO order
2. Detaches Redux middleware
3. Removes event listeners from registry
4. Calls `kernelEventsPlugin.destroy()`
5. Errors are logged but don't throw (graceful failure)

**Use for:**

- Hot module replacement in development
- Test cleanup between test runs
- Plugin deactivation (if needed)

---

## Key Differences from Legacy Architecture

### Before (Pre-Phase 1-7):

- ✗ `withKernel()` was separate bootstrap (positional params)
- ✗ `defineAction(name, fn, options)` used positional parameters
- ✗ `definePolicy(map, options)` used positional parameters
- ✗ UI hooks relied on `__WP_KERNEL_UI_ATTACH_RESOURCE_HOOKS__` global
- ✗ Pending resource queue for late UI loading
- ✗ Cached action dispatcher in global scope
- ✗ Side-effect imports (`import '@wpkernel/ui'`)

### After (Current):

- ✓ `configureKernel()` is unified bootstrap (config object)
- ✓ All definition APIs use config objects: `{ name, handler, options }`
- ✓ UI integration via adapter: `{ ui: { attach: attachUIBindings } }`
- ✓ Event-driven hook attachment via `kernel.events`
- ✓ No globals except `__WP_KERNEL_ACTION_RUNTIME__` (escape hatch)
- ✓ Typed event bus with canonical events
- ✓ `KernelInstance` exposes all runtime services
- ✓ React context via `<KernelUIProvider />`

---

## Quick Reference: Complete API Surface

### Core Definition APIs

```typescript
// Resources
const Posts = defineResource<Post, PostQuery>({
	name: 'posts',
	routes: { get: '/wp/v2/posts/:id', list: '/wp/v2/posts' },
});

// Actions
const CreatePost = defineAction<CreateArgs, Post>({
	name: 'Post.Create',
	handler: async (ctx, args) => {
		/* ... */
	},
	options: { scope: 'crossTab', bridged: true },
});

// Policies
const policies = definePolicy<PolicyMap>({
	map: {
		'posts.create': () => wp.data.select('core').canUser('create', 'posts'),
	},
	options: { namespace: 'my-plugin', debug: true },
});
```

### Bootstrap

```typescript
import { configureKernel } from '@wpkernel/core';
import { attachUIBindings, KernelUIProvider } from '@wpkernel/ui';

const kernel = configureKernel({
  namespace: 'my-plugin',
  registry: window.wp.data,
  reporter: createReporter({ level: 'debug' }),
  middleware: [customMiddleware],
  ui: { attach: attachUIBindings }
});

// React integration
<KernelUIProvider runtime={kernel.getUIRuntime()}>
  <App />
</KernelUIProvider>
```

### React Hooks

```typescript
// Resource hooks (auto-attached to resources)
const { data, isLoading, error } = Posts.useGet(id);
const { data, isLoading, error } = Posts.useList(query);

// Action hook
const { run, status, result, error, reset } = useAction(CreatePost, {
	concurrency: 'switch',
	onSuccess: (result) => {
		/* ... */
	},
	onError: (error) => {
		/* ... */
	},
});

// Policy hook
const policy = usePolicy();
const canCreate = policy.can('posts.create');

// Prefetch hooks
const prefetcher = usePrefetcher(Posts);
useHoverPrefetch(ref, () => prefetcher.prefetchList());
useVisiblePrefetch(ref, () => prefetcher.prefetchGet(id));
useNextPagePrefetch(Posts, currentQuery);
```

### Event Subscription

```typescript
kernel.events.on('action:complete', ({ actionName, result, durationMs }) => {
	console.log(`${actionName} completed in ${durationMs}ms`);
});

kernel.events.on('resource:defined', ({ resource, namespace }) => {
	console.log(`Resource ${resource.name} registered in ${namespace}`);
});

kernel.events.on('cache:invalidated', ({ keys, storeKey }) => {
	console.log(`Invalidated ${keys.length} cache keys`);
});
```

### Action Context API

Available inside `defineAction` handler:

```typescript
defineAction({
	name: 'Example',
	handler: async (ctx, args) => {
		// Correlation & namespace
		ctx.requestId; // Unique ID for this invocation
		ctx.namespace; // Resolved namespace

		// Events
		ctx.emit('my-plugin.thing.happened', { id: 123 });

		// Cache
		ctx.invalidate(['resource', 'list']);
		ctx.invalidate([/^resource\//]);

		// Policy
		ctx.policy.assert('capability');
		const allowed = ctx.policy.can('capability', ...params);

		// Jobs (if implemented)
		await ctx.jobs.enqueue('JobName', { data });
		const result = await ctx.jobs.wait(
			'JobName',
			{ data },
			{ timeout: 5000 }
		);

		// Logging
		ctx.reporter.info('Message', { context });
		ctx.reporter.warn('Warning', { context });
		ctx.reporter.error('Error', error);
		ctx.reporter.debug('Debug info', { context });
	},
});
```

---

## Summary

WP Kernel provides a cohesive, type-safe framework for WordPress product development with:

- **Unified Bootstrap** - `configureKernel()` as single configuration point
- **Event-Driven Architecture** - Typed `KernelEventBus` with canonical events
- **Adapter-Driven UI** - Explicit runtime integration via `attachUIBindings`
- **Config-Object APIs** - Consistent definition patterns across actions, resources, policies
- **Zero Globals** - Clean integration without side-effect imports
- **Full Type Safety** - TypeScript throughout with proper type inference
- **WordPress Integration** - Native `@wordpress/data` support with middleware and store registration

The framework is production-ready after completing Phases 1-7 of the architecture overhaul. All APIs are stable, tested (976 passing tests), and documented.

---

**Document Version:** 2.0  
**Framework Version:** 0.7.0 (released)
**Generated:** 9 October 2025
