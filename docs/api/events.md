# Events API

> **Status**: 🚧 Foundation implemented (Sprint 1). Full API coming in Sprint 4.

Canonical event taxonomy for observability and extensibility.

## Currently Available Events (Sprint 1)

### Resource Transport Events

Emitted by the HTTP transport layer during resource operations:

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

Each resource provides event names via the `events` property:

```typescript
import { testimonial } from './resources/testimonial';

// Access event names
console.log(testimonial.events.created); // 'wpk.testimonial.created'
console.log(testimonial.events.updated); // 'wpk.testimonial.updated'
console.log(testimonial.events.removed); // 'wpk.testimonial.removed'
```

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
