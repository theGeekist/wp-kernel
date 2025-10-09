# Jobs

> **Status**: 🚧 This page will be expanded in Sprint 1+

Background work with polling support.

Queue long-running tasks from Actions. Client can poll for status updates.

## Quick Reference

```typescript
import { defineJob } from '@geekist/wp-kernel/jobs';

export const IndexTestimonial = defineJob({
	name: 'IndexTestimonial',
	handler: {
		enqueue: (params: { id: number }) => {
			// POST /wpk/v1/jobs/index-testimonial
		},
		status: (params) => {
			// GET /wpk/v1/jobs/index-testimonial/status?id=...
		},
	},
});

// Usage in Actions
await jobs.enqueue('IndexTestimonial', { id: 123 });

// Wait for completion (optional)
await jobs.wait(
	'IndexTestimonial',
	{ id: 123 },
	{
		pollInterval: 1500,
		pollTimeout: 60000,
	}
);
```

## See Also

- [Actions Guide](/guide/actions) - Enqueueing jobs from actions
- [API Reference](/api/jobs) - Complete API docs (coming soon)
