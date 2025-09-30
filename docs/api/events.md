# Events API

> **Status**: 🚧 Auto-generated API docs coming in Sprint 1+

## Canonical Event Registry

Import canonical events from the registry:

```typescript
import { events } from '@geekist/wp-kernel/events';
```

## Event Naming Convention

All events follow the pattern: `wpk.{domain}.{action}`

Examples:

- `wpk.thing.created`
- `wpk.thing.updated`
- `wpk.thing.deleted`
- `wpk.job.enqueued`
- `wpk.job.completed`

## Emitting Events

```typescript
import { events } from '@geekist/wp-kernel/events';

action.emit(events.thing.created, {
	id: thing.id,
	data: thing,
});
```

## Listening to Events

```typescript
import { addAction } from '@wordpress/hooks';
import { events } from '@geekist/wp-kernel/events';

addAction(events.thing.created, 'my-plugin', (payload) => {
	console.log('Thing created:', payload.id);
});
```

## PHP Bridge

Selected events are mirrored to PHP:

```php
add_action('wpk.bridge.thing.created', function($payload) {
    error_log('Thing created: ' . $payload['id']);
});
```

## Complete Reference

See [Event Taxonomy Quick Card](https://github.com/theGeekist/wp-kernel/blob/main/information/REFERENCE%20-%20Event%20Taxonomy%20Quick%20Card.md) for the full event list.
