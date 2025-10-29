# Actions API

Actions orchestrate every write in WP Kernel. They wrap resource mutations with
capability checks, cache invalidation, lifecycle events, and background job hooks.

## `defineAction`

```ts
import { defineAction } from '@wpkernel/core/actions';
```

### Signature

```ts
import type { ActionContext } from '@wpkernel/core/actions';

function defineAction<TArgs, TResult>(
	actionName: string,
	execute: (ctx: ActionContext, args: TArgs) => Promise<TResult>,
	options?: {
		scope?: 'crossTab' | 'tabLocal';
		bridged?: boolean;
	}
): (args: TArgs) => Promise<TResult>;
```

### Usage

```ts
import { defineAction } from '@wpkernel/core/actions';
import { defineResource } from '@wpkernel/core/resource';

const testimonial = defineResource<Testimonial>({
	name: 'testimonial',
	routes: {
		create: { path: '/my-plugin/v1/testimonials', method: 'POST' },
	},
});

export const CreateTestimonial = defineAction<
	{ data: Testimonial },
	Testimonial
>('Testimonial.Create', async (ctx, { data }) => {
	ctx.capability.assert('testimonials.create');

	const created = await testimonial.create!(data);

	ctx.emit(testimonial.events.created, {
		id: created.id,
		data: created,
	});

	ctx.invalidate(['testimonial', 'list']);
	await ctx.jobs.enqueue('IndexTestimonial', { id: created.id });

	return created;
});
```

### Context surface

The `ActionContext` provided to the implementation exposes:

- `requestId` - unique correlation identifier shared with transport calls.
- `namespace` - resolved namespace for canonical event names.
- `emit(eventName, payload)` - emit canonical domain events and BroadcastChannel
  notifications.
- `invalidate(patterns, options?)` - invalidate resource caches.
- `jobs.enqueue(name, payload)` / `jobs.wait(name, payload, options?)` -
  background job integration.
- `capability.assert(capability)` / `capability.can(capability)` - capability checks.
- `reporter` - structured logging hooks (`info`, `warn`, `error`, `debug`).

### Lifecycle events

Each invocation automatically emits lifecycle hooks via `@wordpress/hooks`:

- `wpk.action.start` - before execution, payload includes args and metadata.
- `wpk.action.complete` - after success, payload includes result and duration.
- `wpk.action.error` - on failure, payload includes normalized `WPKernelError`.

Events are broadcast cross-tab by default. Set `scope: 'tabLocal'` to keep events
within the current tab; tab-local actions never bridge to PHP even when
`bridged: true` is provided.

## Redux middleware helper

```ts
import { createActionMiddleware, invokeAction } from '@wpkernel/core/actions';
```

The middleware helper lets you dispatch kernel actions through any Redux-like
store (including `@wordpress/data`).

```ts
const middleware = createActionMiddleware();
const store = createReduxStore('my/store', reducers, [middleware]);

// Later…
store.dispatch(invokeAction(CreateTestimonial, { data }));
```

Dispatching the `invokeAction` envelope returns the action promise, making it
compatible with async flows and allowing callers to `await` the dispatch. The
middleware ignores unrelated actions and forwards them to the next handler.

## Runtime configuration

Host applications can supply a runtime adapter via
`global.__WP_KERNEL_ACTION_RUNTIME__` to plug in custom reporters, capability
systems, background job runners, or event bridges. Without configuration the
context falls back to console reporting and throws `NotImplementedError` when
job helpers are invoked.
