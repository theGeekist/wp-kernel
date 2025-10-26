# WordPress Data Integration

WP Kernel integrates with `@wordpress/data` through the `configureKernel()` bootstrap. The helper installs the registry middleware, forwards to the existing events plugin, and returns a kernel instance you can use immediately so every runtime surface shares the same configuration.

Core primitives-resources, actions, cache helpers-continue to work without any bootstrap. Stores register themselves and actions can be invoked directly. Calling `configureKernel()` layers in observability, WordPress hooks integration, and optional Redux dispatch so the rest of the ecosystem can listen in.

## `configureKernel(config)` - Unified bootstrap

`configureKernel()` accepts a small configuration object and returns a `KernelInstance`. The instance exposes shared services such as the namespace, reporter, cache helpers, and `KernelEventBus` (`kernel.events`) so you can subscribe to lifecycle updates without touching globals.

```ts
import { configureKernel } from '@wpkernel/core';

const kernel = configureKernel({
	namespace: 'acme',
	registry: window.wp.data,
	ui: { enable: false },
});

kernel.emit('acme.bootstrap.ready', { timestamp: Date.now() });
```

### What it wires

- **Registry integration** - Installs the existing `kernelEventsPlugin`, bridges action errors into `core/notices`, and forwards lifecycle events to `wp.hooks` when available.
- **Redux middleware (optional)** - Appends the action middleware that powers `invokeAction()` envelopes. Hooks like `useAction()` rely on this layer.
- **Reporter resolution** - Reuses a provided reporter or creates one scoped to the detected namespace. Retrieve it any time with `kernel.getReporter()`.
- **Cache + events helpers** - Call `kernel.invalidate()` to reuse the canonical resource cache helpers and `kernel.emit()` to publish domain events.
- **UI plumbing** - Pass `ui: { enable: true }` to opt into UI runtime integration in later phases. The flag defaults to `false` so nothing changes until you enable it.

### Instance helpers available today

The initial instance surface focuses on read-mostly helpers:

- `kernel.getNamespace()` - Returns the namespace resolved during configuration.
- `kernel.getReporter()` - Provides access to the shared reporter.
- `kernel.invalidate(patterns, options?)` - Delegates to the cache helpers using the configured registry.
- `kernel.emit(eventName, payload)` - Emits custom events through WordPress hooks (and existing bridges).
- `kernel.ui.isEnabled()` - Reports whether UI integration was requested.
- `kernel.teardown()` - Removes middleware and listeners that were installed during configuration (useful in tests and hot reloads).

## Core functionality without `configureKernel()`

Resources, actions, and cache helpers remain self-sufficient:

- `defineResource()` automatically registers stores with the WordPress registry.
- `defineAction()` works as a plain async function: `await CreatePost({ title: 'Hello' })`.
- Resource hooks such as `useGet()` and `useList()` continue to function without registry middleware.
- Lifecycle events still call into `wp.hooks.doAction()` when the hooks runtime exists.

You gain additional telemetry, notices, and Redux dispatch once `configureKernel()` runs.

## Why production plugins should configure the kernel

### Registry integration (recommended)

1. **Consistent error handling** - Kernel errors map into WordPress notices automatically while emitting structured reporter output.
2. **Ecosystem extensibility** - Lifecycle and domain events bridge into `wp.hooks` so PHP plugins or other JS bundles can observe them.
3. **Centralised observability** - All events flow through the shared reporter, giving you a single telemetry pipeline.
4. **Cross-tab coordination** - `scope: 'crossTab'` actions continue to use `BroadcastChannel` for synchronisation.

### Redux middleware (only when using `useAction()`)

5. **Redux dispatch** - `invokeAction()` envelopes dispatch through the registry so `useAction()` hooks can provide loading and error states.
6. **Type-safe envelopes** - Middleware unwraps the action metadata and ensures dispatch stays strongly typed.

Actions retain their full `ActionContext` (policy enforcement, cache invalidation, reporter access, `ctx.emit()`) whether called directly or dispatched through Redux.

## Practical examples

### Minimal bootstrap (plugin entry point)

```ts
import { configureKernel, registerKernelStore } from '@wpkernel/core';

export function bootstrap(registry) {
	const kernel = configureKernel({
		registry,
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

	return kernel.teardown;
}
```

### Calling actions directly (no Redux middleware required)

```ts
import { CreateItem } from './actions/CreateItem';

// Direct function call - works without configureKernel()
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
		console.error(error);
	}
}
```

### Dispatch kernel actions via Redux store (requires middleware)

```ts
import { invokeAction } from '@wpkernel/core/actions';
import { CreateItem } from './actions/CreateItem';

export async function createItemViaStore(store, payload) {
	const envelope = invokeAction(CreateItem, payload);
	const result = await store.dispatch(envelope);
	return result;
}
```

> Ensure `configureKernel({ registry })` runs before dispatching envelopes so the middleware is installed.

### Automatic notices & reporting

If `CreateItem` throws `KernelError('ValidationError', { message: 'Bad input' })`, then after `configureKernel({ registry })` runs:

- `core/notices.createNotice('info', 'Bad input')` fires once the store is registered.
- The configured reporter receives `error(...)` with contextual metadata.

### Add tracing middleware

```ts
const metricsMiddleware = () => (next) => async (action) => {
	const start = performance.now();
	const result = await next(action);
	console.debug('action', action.type, 'took', performance.now() - start);
	return result;
};

configureKernel({
	registry,
	namespace: 'my-plugin',
	middleware: [metricsMiddleware],
});
```

### Custom reporter

```ts
import { configureKernel, createReporter } from '@wpkernel/core';

const reporter = createReporter({
	namespace: 'my-plugin',
	channel: 'console',
	level: 'debug',
});

configureKernel({ registry, reporter });
```

### PHP / WP hooks listeners

`configureKernel()` forwards action events into `wp.hooks`, so a PHP plugin can listen, while the `KernelEventBus` gives JavaScript consumers a typed subscription surface:

```php
add_action( 'wpk.action.error', 'my_plugin_handle_action_error', 10, 1 );
function my_plugin_handle_action_error( $payload ) {
        // Contains actionName, requestId, namespace, and error metadata.
}
```

## Edge cases & limitations

- **Registry support** - No-op when `__experimentalUseMiddleware` is missing (older `@wordpress/data`).
- **Missing hooks** - If `window.wp?.hooks` is absent, lifecycle events stay internal.
- **Notice dependencies** - Without `core/notices`, notice forwarding is skipped but reporter logging stays active.
- **BroadcastChannel** - Absent in SSR or older browsers; cross-tab sync degrades gracefully.
- **Runtime configuration** - Policy engines and reporters rely on runtime wiring. Background jobs and PHP bridge integrations arrive in later phases.
- **Middleware ordering** - Custom middleware runs after the kernel middleware. Ensure ordering aligns with your instrumentation requirements.

## Best practices

- Call `configureKernel()` once per registry at bootstrap; retain the teardown for tests and hot module replacement.
- Register stores via `registerKernelStore()` so they inherit kernel-aware behaviour.
- Throw `KernelError` subclasses from actions for structured notice mapping.
- Provide a production reporter to forward logs to your telemetry system.
- Use `kernel.emit()` for domain events so they route through existing bridges.

## Summary

`configureKernel()` is the canonical bootstrap for WP Kernel. It installs the middleware stack, exposes the shared reporter and namespace, and prepares the ecosystem bridges that production plugins rely on. Configure once and let the kernel handle the wiring.

## `usePolicy()` - gate UI with runtime capabilities

`usePolicy` gives components access to the active policy runtime so UI can conditionally render based on capabilities.
