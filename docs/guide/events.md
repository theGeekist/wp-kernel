# Events

> **Status**: ✓ **Fully Implemented** – JavaScript event system now flows through
> `KernelEventBus` with a WordPress hooks bridge.
>
> **PHP Bridge**: 🚧 Planned for Sprint 9 (legacy plugin integrations).

Stable, versioned event registry with predictable names. All events come from a
central registry-no ad-hoc strings. `KernelEventBus` is the authoritative
publisher: every lifecycle notification runs through the bus first, then the
kernel events plugin forwards canonical events into `wp.hooks` for backwards
compatibility. JavaScript remains the source of truth, but consumers can choose
between the bus (typed subscriptions) or WordPress hooks (legacy interoperability)
without losing coverage.

```ts
import { configureKernel } from '@geekist/wp-kernel';

const kernel = configureKernel({ namespace: 'acme' });

const unsubscribe = kernel.events.on('action:complete', (event) => {
	kernel.getReporter().info('Action completed', {
		action: event.actionName,
		requestId: event.requestId,
	});
});

// WordPress hooks still receive the same payloads via the bridge
addAction('wpk.action.complete', 'acme/logger', (event) => {
	window.console.log('Legacy listener:', event);
});
```

## What's Available Now

All events below are **implemented and working** in the current release. Subscribe to them using `addAction()` from `@wordpress/hooks`.

### Resource Transport Events

Automatically emitted by the HTTP transport layer (framework events use `wpk.*` namespace):

```typescript
// Before making a REST request
'wpk.resource.request': {
  resourceName: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  params?: Record<string, unknown>;
  requestId: string;
}

// After successful response
'wpk.resource.response': {
  resourceName: string;
  method: string;
  path: string;
  status: number;
  data: unknown;
  requestId: string;
}

// On transport/server error
'wpk.resource.error': {
  resourceName: string;
  error: KernelError;
  requestId: string;
}

// During retry attempts
'wpk.resource.retry': {
  resourceName: string;
  attempt: number;
  nextDelay: number;
  error: KernelError;
  requestId: string;
}
```

### Cache Invalidation Events

Emitted when cache is invalidated (framework events use `wpk.*` namespace):

```typescript
'wpk.cache.invalidated': {
  keys: string[];
}
```

### Per-Resource CRUD Events

✓ **Available Now**: Each resource automatically gets event names (available via `resource.events`), emitted by Actions layer during create/update/delete operations.

```typescript
import { testimonial } from './resources/testimonial';

// Event names use auto-detected namespace (e.g., plugin slug: "acme-blog")
testimonial.events.created; // 'acme-blog.testimonial.created'
testimonial.events.updated; // 'acme-blog.testimonial.updated'
testimonial.events.removed; // 'acme-blog.testimonial.removed'
```

**Usage**: Actions emit these events when resources are created, updated, or removed.

### Namespace Auto-Detection

WP Kernel automatically detects your plugin's namespace to brand events correctly:

```typescript
// Your plugin: "ACME Blog Pro" (slug: acme-blog)
export const post = defineResource<Post>({
	name: 'post', // Auto-detects namespace from plugin context
	routes: {
		/* ... */
	},
});

console.log(post.events.created); // 'acme-blog.post.created' ✓

// Override namespace when needed
export const customPost = defineResource<Post>({
	name: 'post',
	namespace: 'enterprise', // Explicit override
	routes: {
		/* ... */
	},
});

console.log(customPost.events.created); // 'enterprise.post.created' ✓
```

### Action Events

✓ **Available Now**: Emitted during action execution lifecycle.

```typescript
// Action started
'wpk.action.start': {
  actionName: string;
  args: unknown;
  requestId: string;
}

// Action completed
'wpk.action.complete': {
  actionName: string;
  result: unknown;
  requestId: string;
}

// Action failed
'wpk.action.error': {
  actionName: string;
  error: KernelError;
  requestId: string;
}
```

### Policy Events

✓ **Available Now**: Emitted during policy checks.

```typescript
// Client policy check failed
'wpk.policy.denied': {
  policyKey: string;
  context?: Record<string, unknown>;
}
```

### Job Events

✓ **Available Now**: Emitted during background job processing.

```typescript
// Job queued
'wpk.job.enqueued': {
  jobName: string;
  params: Record<string, unknown>;
  jobId: string;
}

// Job completed
'wpk.job.completed': {
  jobName: string;
  jobId: string;
  result: unknown;
}

// Job failed
'wpk.job.failed': {
  jobName: string;
  jobId: string;
  error: KernelError;
}
```

## Quick Examples

### Listen to Your Application Events

```typescript
import { addAction } from '@wordpress/hooks';

// Track your resource requests (uses your namespace)
addAction('acme-blog.resource.request', 'acme-blog/analytics', (payload) => {
	console.log(`${payload.method} ${payload.path}`);
});

// Handle your application errors
addAction('acme-blog.resource.error', 'acme-blog/error-handler', (payload) => {
	showNotice(`Request failed: ${payload.error.message}`, 'error');
});
```

### Listen to Cache Invalidation

```typescript
import { addAction } from '@wordpress/hooks';

// Listen to your application's cache events
addAction('acme-blog.cache.invalidated', 'acme-blog/debug', (payload) => {
	console.log('Cache invalidated:', payload.keys);
});
```

### Listen to Framework Events

```typescript
// Framework events use 'wpk' namespace
addAction('wpk.system.error', 'acme-blog/system-monitor', (payload) => {
	console.log('Framework error:', payload.error);
});
```

### Access Resource Event Names

```typescript
import { thing } from './resources/thing';

console.log(thing.events.created); // 'your-plugin.thing.created'
console.log(thing.events.updated); // 'your-plugin.thing.updated'
console.log(thing.events.removed); // 'your-plugin.thing.removed'

// Emitted by Actions when resources are created/updated/removed
```

### Emit Events from Actions

```typescript
import { defineAction } from '@geekist/wp-kernel';
import { thing } from './resources/thing';

export const CreateThing = defineAction(
	'Thing.Create',
	async (ctx, { data }) => {
		const result = await thing.create(data);

		// Emit standard CRUD event
		ctx.emit(thing.events.created, {
			id: result.id,
			data: result,
		});

		// Emit custom domain event
		const namespace = thing.events.created.split('.')[0];
		ctx.emit(`${namespace}.thing.submitted`, {
			id: result.id,
			status: 'pending',
		});

		return result;
	}
);
```

## Future: PHP Bridge (Sprint 9)

> **⚠️ NOT YET IMPLEMENTED**: PHP event bridge is planned for Sprint 9.

The PHP bridge will mirror selected JavaScript events to WordPress `do_action()` hooks for legacy plugin integrations:

```php
// 🚧 FUTURE - NOT YET AVAILABLE
add_action('wpk.bridge.acme-blog.thing.created', function($payload) {
    // React to thing creation in PHP
    error_log('New thing: ' . $payload['id']);

    // Send webhook, update external system, etc.
}, 10, 1);
```

**Key features (when implemented)**:

- **Sync events**: Run immediately, block JS (< 100ms budget)
- **Async events**: Queued via Action Scheduler (process within 60s)
- **Automatic prefix**: `wpk.bridge.` prefix added to all mirrored events
- **Selective mirroring**: Only cross-tab events, not per-tab events

## Full Event Taxonomy

For the complete event taxonomy, payload contracts, PHP bridge planning, versioning rules, and best practices, see:

**[Event Taxonomy Quick Reference](https://github.com/theGeekist/wp-kernel/blob/main/information/Event%20Taxonomy%20Quick%20Reference.md)**

This is the authoritative specification for the entire event system. The JavaScript implementation is complete; PHP bridge is planned for Sprint 9.

## See Also

- [Resources Guide](/guide/resources) - Resource transport and caching
- [Actions Guide](/guide/actions) - Write path orchestration (Sprint 4)
- [API Reference](/api/events) - Complete API docs
