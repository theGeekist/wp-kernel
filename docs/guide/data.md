# WordPress Data Integration

WP Kernel integrates seamlessly with `@wordpress/data` to bridge custom plugin logic into the broader WordPress ecosystem. Its main integration API, `withKernel()`, connects two key runtime layers: a registry integration that enhances extensibility and observability within the WordPress ecosystem, and an optional Redux middleware that enables action dispatch through Redux stores.

Core WP Kernel functionality-including resources and actions-works independently of `withKernel()`. Resources auto-register stores, and actions can be called directly as functions without requiring this integration. Using `withKernel()` adds an extensibility layer that standardizes error handling, event bridging, and reporting, as well as optional Redux dispatch capabilities for React hooks like `useAction()`.

### 1. Registry Integration (Recommended for Production)

**Purpose**: Bridges kernel runtime into WordPress ecosystem for extensibility and observability.

**What it provides**:

- **`kernelEventsPlugin`** - Bridges action errors to `core/notices` store automatically
- **WordPress hooks integration** - Connects lifecycle events to `wp.hooks` so 3rd-party plugins can listen
- **Reporter integration** - Centralized observability for errors and events
- **Ecosystem extensibility** - Makes your plugin interoperable with WordPress ecosystem

**When you need this**: Most production plugins should use this layer for consistent error handling and ecosystem integration.

### 2. Redux Middleware (Optional - Only for `useAction()` hook)

**Purpose**: Enables Redux dispatch of actions through `@wordpress/data` stores.

**What it provides**:

- **`createActionMiddleware`** - Intercepts action envelopes and executes them
- **Redux dispatch** - Enables `useAction()` React hook to dispatch through stores
- **Type-safe envelopes** - `invokeAction()` wraps actions for Redux dispatch

**When you need this**: Only if you're using the `useAction()` React hook. If you call actions directly (`await CreatePost(args)`), you don't need this layer.

## Core Functionality Works Without `withKernel()`

**Important**: Resources and Actions are designed to work standalone:

- **`defineResource()`** - Auto-registers stores with `wp.data.register()` without any middleware
- **`defineAction()`** - Works as direct function calls: `await CreatePost({ title: 'Hello' })`
- **Resource hooks** - `useGet()` and `useList()` work with auto-registered stores
- **Events** - Lifecycle events still emit via `wp.hooks.doAction()` when present

The `withKernel()` integration adds the **extensibility layer** (recommended) and **optional Redux dispatch** (for `useAction()` hook only).

## What WP Kernel provides

WP Kernel standardizes how plugins and themes interact with data, actions, events, jobs, and error reporting:

- **Typed actions system** – Actions are first-class functions you can call directly or dispatch through Redux
- **Resource system** – Define REST-backed resources once and get stores, cache helpers, fetch/prefetch utilities, and events for free
- **Events and reporting** – Lifecycle events, domain events, reporter integrations, and cross-tab sync keep behaviour observable
- **WordPress data integration** – `withKernel()` bridges kernel runtime into WordPress ecosystem
- **Background jobs** – Roadmap feature (Sprint 6) that will let actions enqueue durable background work via `defineJob()`
- **PHP bridge** – Roadmap feature (Sprint 9) to mirror events into PHP for legacy plugin interoperability

## `withKernel(registry, options)` – WordPress Data Integration

Calling `withKernel(registry, options)` enables two integration layers:

**Layer 1: Registry Integration (Recommended)**

- **Installs kernel events plugin** – Bridges action lifecycle events to `wp.hooks`, forwards errors to `core/notices.createNotice`, reports to configured `Reporter`
- **Enables ecosystem extensibility** – 3rd-party plugins can listen to kernel events via WordPress hooks
- **Centralized observability** – All errors and events flow through unified reporter

**Layer 2: Redux Middleware (Optional - Only for `useAction()` hook)**

- **Installs action execution middleware** – Enables dispatch of action envelopes through Redux stores
- **Required for `useAction()` hook** – If you call actions directly (`await CreatePost(args)`), this layer is unused

**Additional Features**:

- **Accepts additional middleware** – Pass `{ middleware: [myMiddleware] }` to append custom middleware after the kernel handler
- **Returns a cleanup function** – Remove middleware and detach WP hooks, which keeps hot reloads, tests, and SPA lifecycles stable

### Why production plugins should use `withKernel()`

**For Registry Integration (Recommended for all production plugins)**:

1. **Consistent error handling** – Kernel errors map into WordPress notices automatically while still logging structured context through the reporter
2. **Ecosystem extensibility** – Lifecycle and domain events are bridged into `wp.hooks` so PHP-side plugins or other JS code can observe them
3. **Centralized observability** – Reporter integration provides unified logging and error tracking
4. **Cross-tab coordination** – `scope: 'crossTab'` actions sync via `BroadcastChannel`. PHP bridge coming in Sprint 9

**For Redux Middleware (Only if using `useAction()` hook)**: 5. **Redux dispatch** – Enables `useAction()` React hook for reactive action execution with loading/error states 6. **Type-safe envelopes** – `invokeAction()` wraps actions in type-safe envelopes for Redux dispatch

**Note**: Actions have full `ActionContext` capabilities (policy enforcement, lifecycle events, `ctx.emit()`, cache invalidation, reporter logging) whether called directly or dispatched through Redux.

### Practical examples

#### Minimal bootstrap (plugin entry point)

```ts
import { withKernel } from '@geekist/wp-kernel';
import { registerKernelStore } from '@geekist/wp-kernel';

export function bootstrap(registry) {
	const teardown = withKernel(registry, {
		namespace: 'my-plugin',
	});

	registerKernelStore('my-plugin/items', {
		reducer: itemsReducer,
		actions: {
			/* actions for local state */
		},
		selectors: {
			/* selectors */
		},
		controls: {},
	});

	return teardown;
}
```

#### Calling actions directly (no Redux middleware needed)

```ts
import { CreateItem } from './actions/CreateItem';

// Direct function call - works without withKernel()
export async function createItem(payload) {
	try {
		const result = await CreateItem(payload);
		// Action still has full ActionContext capabilities:
		// - Policy enforcement
		// - Lifecycle events (wpk.action.start/complete/error)
		// - ctx.emit() for domain events
		// - Cache invalidation
		// - Reporter logging
		return result;
	} catch (error) {
		// Handle error
		console.error(error);
	}
}
```

#### Dispatch kernel actions via Redux store (requires withKernel())

```ts
import { invokeAction } from '@geekist/wp-kernel/actions';
import { CreateItem } from './actions/CreateItem';

export async function createItemViaStore(store, payload) {
	const envelope = invokeAction(CreateItem, payload);
	const result = await store.dispatch(envelope);
	return result;
}
```

#### Automatic notices & reporting

If `CreateItem` throws `KernelError('ValidationError', { message: 'Bad input' })`, then after `withKernel(registry)` runs:

- `core/notices.createNotice('info', 'Bad input')` fires when the store is registered.
- The configured reporter receives `error(...)` with contextual metadata.

#### Add tracing middleware

```ts
const metricsMiddleware = () => (next) => async (action) => {
	const start = performance.now();
	const result = await next(action);
	console.debug('action', action.type, 'took', performance.now() - start);
	return result;
};

const teardown = withKernel(registry, { middleware: [metricsMiddleware] });
```

#### Custom reporter

```ts
import { withKernel } from '@geekist/wp-kernel';
import { createReporter } from '@geekist/wp-kernel';

const reporter = createReporter({
	namespace: 'my-plugin',
	channel: 'console',
	level: 'debug',
});

withKernel(registry, { reporter });
```

#### PHP / WP hooks listeners

`withKernel` forwards action events into `wp.hooks`, so a PHP plugin can listen:

```php
add_action( 'wpk.action.error', 'my_plugin_handle_action_error', 10, 1 );
function my_plugin_handle_action_error( $payload ) {
        // Contains actionName, requestId, namespace, and error metadata.
}
```

### Edge cases & limitations

- **Registry support** – No-op when `__experimentalUseMiddleware` is missing (older `@wordpress/data`).
- **Missing hooks** – If `window.wp?.hooks` is absent, lifecycle events stay internal.
- **Notice dependencies** – Without `core/notices`, notice forwarding is skipped but reporter logging stays active.
- **BroadcastChannel** – Absent in SSR or older browsers; cross-tab sync degrades gracefully.
- **Runtime configuration** – Policy engines and reporters rely on runtime wiring. Background jobs and PHP bridge integrations will arrive with future roadmap sprints.
- **Middleware ordering** – Custom middleware runs after the kernel middleware. Ensure ordering aligns with your instrumentation requirements.

### Best practices

- Call `withKernel(registry)` once per registry at bootstrap; it is idempotent for typical usage.
- Register stores via `registerKernelStore()` so they inherit kernel-aware behaviour.
- Throw `KernelError` subclasses from actions for structured notice mapping.
- Provide a production reporter to forward logs to your telemetry system.
- Retain the teardown function for tests and hot module replacement.

### Summary

`useKernel` is the framework’s public bootstrapping API. Calling it enables participation in the kernel ecosystem: typed actions, lifecycle & domain events bridged to `wp.hooks`, automatic notices, cross-tab coordination, extensible middleware, and upcoming job/bridge integrations. Plugin authors gain consistency and interoperability without bespoke wiring.

## `usePolicy()` – gate UI with runtime capabilities

`usePolicy` gives components access to the active policy runtime so UI can conditionally render based on capabilities.

### What `usePolicy` does

- Subscribes to the policy cache so capability decisions stay reactive.
- Exposes `can(key, ...params)` to evaluate policy helpers.
- Surfaces `keys`, `isLoading`, and `error` for loading/error states.
- Emits developer-friendly errors when no policy runtime is wired (remember to call `definePolicy()` during bootstrap).

### Why authors should use `usePolicy`

1. **Policy-driven UX** – Render controls only when authorised, using the same rules as action execution.
2. **Shared cache** – Reads from the kernel’s policy cache, including cross-tab synchronisation.
3. **Consistency** – Keeps UI behaviour aligned with policy enforcement in the action layer.
4. **Graceful loading** – Reflects `isLoading` and `error` so you can show skeletons or fallback messages.

### Example

```ts
import { usePolicy } from '@geekist/wp-kernel-ui';
import type { PolicyKeys } from '../policies';

export function DeleteButton({ postId }) {
        const { can, isLoading, error } = usePolicy<PolicyKeys>();
        const allowed = can('posts.delete', { postId });

        if (isLoading) {
                return <Spinner />;
        }
        if (!allowed) {
                return null;
        }
        if (error) {
                return <Notice status="warning">{error.message}</Notice>;
        }

        return <ActionButton action={DeletePost} args={{ postId }} />;
}
```

### Edge cases

- Ensure a policy runtime is registered via `definePolicy()` inside your kernel bootstrap.
- `usePolicy` returns `false` until hydration completes; design loading states accordingly.
- Async `can()` helpers resolve to `false` while pending but propagate errors for observability.

### Summary

Use `usePolicy` to keep UI affordances in sync with capability checks. It leans on the shared policy runtime so action execution and UI gating stay consistent.

## Resource hooks – `useGet` and `useList`

Resource definitions automatically gain `useGet` and `useList` when the UI bundle is loaded. These hooks wrap `@wordpress/data` selectors and lifecycle helpers for you.

### What they provide

- **`useGet(id)`** – Reads a single entity, returning `{ data, isLoading, error }` based on store resolution state.
- **`useList(query)`** – Reads collection data with loading/error signals derived from resolver status.
- **Automatic store hydration** – Accessing the hook ensures the resource store is registered (no manual imports).
- **WordPress awareness** – Hooks require `@wordpress/data.useSelect`; they throw a helpful `KernelError` when unavailable.

### Example

```ts
import { defineResource } from '@geekist/wp-kernel/resource';

export const Posts = defineResource({
        name: 'Posts',
        routes: {
                get: { path: '/wp/v2/posts/:id' },
                list: { path: '/wp/v2/posts' },
        },
});

function PostList() {
        const { data, isLoading, error } = Posts.useList({ per_page: 5 });

        if (isLoading) {
                return <Spinner />;
        }
        if (error) {
                return <Notice status="error">{error}</Notice>;
        }
        if (!data?.items?.length) {
                return <EmptyState>No posts yet.</EmptyState>;
        }

        return (
                <ul>
                        {data.items.map((post) => (
                                <li key={post.id}>{post.title.rendered}</li>
                        ))}
                </ul>
        );
}
```

### Edge cases

- Hooks throw a `DeveloperError` when `@wordpress/data` is absent. Ensure WordPress data is loaded before rendering.
- `useGet` reports `isLoading: true` until the resolver finishes or cached data exists.
- Errors are surfaced as strings (`error` for lists, `error.message` for items) to simplify notice rendering.

### Summary

Let resources supply their own hooks. `useGet` and `useList` provide idiomatic access to resource stores with automatic loading/error states and zero boilerplate.
