# Actions API

> **Status**: 🚧 Coming in Sprint 3

Actions orchestrate write operations (create, update, delete) with event emission, cache invalidation, and job queuing.

## Planned API

```typescript
import { defineAction } from '@geekist/wp-kernel/actions';

export const CreateThing = defineAction('Thing.Create', async ({ data }) => {
	// Orchestrate write operation
	return result;
});

// Use in UI
await CreateThing({ data: formData });
```

See [Actions Guide](/guide/actions) for the full pattern.
