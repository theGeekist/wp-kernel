# Events API

> **Status**: 🚧 Documentation in progress

Canonical event taxonomy for observability and extensibility.

## Current Events

### Resource Events

Emitted by the transport layer:

- `wpk.resource.request` - Before making a REST request
- `wpk.resource.response` - After successful response
- `wpk.resource.error` - On request failure

```typescript
import { addAction } from '@wordpress/hooks';

addAction('wpk.resource.request', 'my-plugin', (event) => {
	console.log(`Request ${event.requestId}: ${event.method} ${event.path}`);
});
```

See [Events Guide](/guide/events) for full taxonomy and examples.

## Related

- [HTTP Transport API](/api/generated/http/README)
