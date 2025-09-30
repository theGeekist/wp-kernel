# Jobs

> **Status**: 🚧 This page will be expanded in Sprint 1+

Background work with polling support.

## Quick Reference

```typescript
import { defineJob } from '@geekist/wp-kernel/jobs';

export const IndexThing = defineJob('IndexThing', {
	enqueue: (params: { id: number }) => {
		// POST /gk/v1/jobs/index-thing
	},
	status: (params) => {
		// GET /gk/v1/jobs/index-thing/status?id=...
	},
});

// Usage
await jobs.enqueue('IndexThing', { id: 123 });
await jobs.wait(
	'IndexThing',
	{ id: 123 },
	{
		pollInterval: 1500,
		pollTimeout: 60000,
	}
);
```

## See Also

- [API Reference](/api/jobs) - Complete API docs (coming soon)
