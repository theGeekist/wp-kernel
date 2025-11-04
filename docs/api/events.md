# Events API

> **Status**: ✓ **Fully Implemented** - JavaScript event system complete. Events work via `@wordpress/hooks` (`addAction`, `doAction`).
>
> **PHP Bridge**: 🚧 Planned for a future release (not yet available).

Canonical event taxonomy for observability and extensibility. All events use WordPress hooks and auto-namespace based on your plugin context.

## Event Naming Convention

Events follow the pattern: `{namespace}.{category}.{event}` where:

- **namespace**:
    - Framework events: Always `WPK_NAMESPACE` from `@wpkernel/core/contracts` (core kernel events)
    - Resource events: Auto-detected from environment or explicitly configured (fallback: that same constant)
- **category**: Type of event (resource, action, job, etc.)
- **event**: Specific event name

## Currently Available Events

All events below are **available now** and can be subscribed to using `addAction()` from `@wordpress/hooks`.

### Resource Transport Events

Emitted by the HTTP transport layer during resource operations. These are **framework events** that always use the `WPK_NAMESPACE` constant:

#### `wpk.resource.request`

Fired before making a REST request.

```typescript
import { addAction } from '@wordpress/hooks';
import { WPK_NAMESPACE } from '@wpkernel/core/contracts';

addAction(`${WPK_NAMESPACE}.resource.request`, 'my-plugin', (event) => {
	console.log(`Request ${event.requestId}: ${event.method} ${event.path}`);
});
```

**Payload**:

```typescript
{
  resourceName: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  params?: Record<string, unknown>;
  requestId: string;
}
```

#### `wpk.resource.response`

Fired after successful response.

```typescript
addAction('wpk.resource.response', 'my-plugin', (event) => {
	console.log(`Response ${event.requestId}: ${event.status}`);
});
```

**Payload**:

```typescript
{
	resourceName: string;
	method: string;
	path: string;
	status: number;
	data: unknown;
	requestId: string;
}
```

#### `wpk.resource.error`

Fired on request failure.

```typescript
addAction('wpk.resource.error', 'my-plugin', (event) => {
	console.error(`Error ${event.requestId}:`, event.error.message);
});
```

**Payload**:

```typescript
{
	resourceName: string;
	error: WPKernelError;
	requestId: string;
}
```

#### `wpk.resource.retry`

Fired during retry attempts.

```typescript
addAction('wpk.resource.retry', 'my-plugin', (event) => {
	console.log(`Retry ${event.attempt} in ${event.nextDelay}ms`);
});
```

**Payload**:

```typescript
{
	resourceName: string;
	attempt: number;
	nextDelay: number;
	error: WPKernelError;
	requestId: string;
}
```

### Cache Events

#### `wpk.cache.invalidated`

Fired when cache keys are invalidated.

```typescript
addAction('wpk.cache.invalidated', 'my-plugin', (event) => {
	console.log('Cache invalidated:', event.keys);
});
```

**Payload**:

```typescript
{
  keys: string[];
}
```

### Resource-Specific Events

Each resource automatically generates events using **auto-detected namespaces**. Unlike framework events which always use `wpk`, resource events use your plugin's detected namespace.

**Status**: ✓ Event names available via `resource.events.*`, emitted by Actions layer when resources are created/updated/removed.

```typescript
import { testimonial } from './resources/testimonial';

// Access event names (namespace auto-detected from your plugin)
console.log(testimonial.events.created); // 'acme-blog.testimonial.created'
console.log(testimonial.events.updated); // 'acme-blog.testimonial.updated'
console.log(testimonial.events.removed); // 'acme-blog.testimonial.removed'

// Subscribe to resource events
import { addAction } from '@wordpress/hooks';

addAction(testimonial.events.created, 'my-plugin', (payload) => {
	console.log('Testimonial created:', payload.data);
});

// Or use the pattern directly (if you know your namespace)
addAction('acme-blog.testimonial.created', 'my-plugin', (payload) => {
	console.log('Testimonial created:', payload.data);
});
```

**Event Pattern**: `{namespace}.{resourceName}.{action}` where:

- `{namespace}`: Auto-detected from your plugin (e.g., 'acme-blog', 'wp-kernel-showcase')
- `{resourceName}`: The resource name from `defineResource({ name: 'testimonial' })`
- `{action}`: CRUD action (`created`, `updated`, `removed`)

### Action Events

**Status**: ✓ Available now, emitted during action execution.

- `wpk.action.start` - Action begins execution
- `wpk.action.complete` - Action completes successfully
- `wpk.action.error` - Action fails

### Capability Events

**Status**: ✓ Available now, emitted during capability checks.

- `wpk.capability.denied` - Capability check fails

### Job Events

**Status**: ✓ Available now, emitted during job lifecycle.

- `wpk.job.enqueued` - Job queued for background processing
- `wpk.job.completed` - Job completes successfully
- `wpk.job.failed` - Job execution fails

## Future: PHP Bridge

> **⚠️ NOT YET IMPLEMENTED**: PHP event bridge is planned for a future release.

The PHP bridge will mirror selected JavaScript events to WordPress `do_action()` hooks for legacy plugin integrations. When implemented:

```php
// 🚧 FUTURE - NOT YET AVAILABLE
add_action('wpk.bridge.acme-blog.testimonial.created', function($payload) {
    // React to testimonial creation in PHP
    error_log('New testimonial: ' . $payload['id']);
}, 10, 1);
```

See the [Event Taxonomy Quick Reference](https://github.com/theGeekist/wp-kernel/blob/main/information/Event%20Taxonomy%20Quick%20Reference.md#php-bridge-future) for planned PHP bridge details.

## Canonical Event Registry

**Status**: ✓ Available now via `resource.events.*` properties.

```typescript
import { defineAction } from '@wpkernel/core';
import { thing } from './resources/thing';

export const CreateThing = defineAction(
	'Thing.Create',
	async (ctx, { data }) => {
		const result = await thing.create(data);

		// Emit resource event
		ctx.emit(thing.events.created, {
			id: result.id,
			data: result,
		});

		return result;
	}
);
```

## Full Specification

For complete event taxonomy, payload contracts, PHP bridge mapping, and versioning rules:

**[Event Taxonomy Quick Reference](https://github.com/theGeekist/wp-kernel/blob/main/information/Event%20Taxonomy%20Quick%20Reference.md)**

## Related

- [Events Guide](/guide/events) - Usage patterns and examples
- [HTTP Transport API](/api/@wpkernel/core/README#http) - Transport implementation
