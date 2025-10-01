# Jobs API

> **Status**: 🚧 Coming in Sprint 2

Jobs handle background work with polling support.

## Planned API

```typescript
import { defineJob, jobs } from '@geekist/wp-kernel/jobs';

export const IndexThing = defineJob('IndexThing', {
	enqueue: (params: { id: number }) => {
		/* ... */
	},
	status: (params) => {
		/* ... */
	},
});

// Enqueue and wait
await jobs.enqueue('IndexThing', { id: 123 });
await jobs.wait('IndexThing', { id: 123 });
```

See [Jobs Guide](/guide/jobs) for examples.
