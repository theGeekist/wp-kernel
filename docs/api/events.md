# Events API

> **Status**: 🚧 Foundation implemented (Sprint 1). Full API coming in Sprint 4.

Canonical event taxonomy for observability and extensibility.

## Event Naming Convention

Events follow the pattern: `{namespace}.{category}.{event}` where:

- **namespace**:
    - Framework events: Always `wpk` (core kernel events)
    - Resource events: Auto-detected from environment or explicitly configured (fallback: 'wpk')
- **category**: Type of event (resource, action, job, etc.)
- **event**: Specific event name

## Currently Available Events (Sprint 1)

### Resource Transport Events

Emitted by the HTTP transport layer during resource operations. These are **framework events** that always use the `wpk` namespace:

#### `wpk.resource.request`

Fired before making a REST request.

```typescript
import { addAction } from '@wordpress/hooks';

addAction('wpk.resource.request', 'my-plugin', (event) => {
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
	error: KernelError;
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
	error: KernelError;
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

Each resource automatically generates events using **auto-detected namespaces**. Unlike framework events which always use `wpk`, resource events use your plugin's detected namespace:

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

**Note**: These events are defined but not automatically emitted yet. They will be emitted by Actions in Sprint 4.

## Coming in Sprint 4+

### Action Events

- `wpk.action.start`
- `wpk.action.complete`
- `wpk.action.error`

### Policy Events (Sprint 3)

- `wpk.policy.denied`

### Job Events (Sprint 8)

- `wpk.job.enqueued`
- `wpk.job.completed`
- `wpk.job.failed`

### Canonical Event Registry

```typescript
// Coming in Sprint 4
import { events } from '@geekist/wp-kernel/events';

action.emit(events.thing.created, { id, data });
```

## Full Specification

For complete event taxonomy, payload contracts, PHP bridge mapping, and versioning rules:

**[Event Taxonomy Quick Reference](https://github.com/theGeekist/wp-kernel/blob/main/information/Event%20Taxonomy%20Quick%20Reference.md)**

## Related

- [Events Guide](/guide/events) - Usage patterns and examples
- [HTTP Transport API](/api/generated/http/README) - Transport implementation
