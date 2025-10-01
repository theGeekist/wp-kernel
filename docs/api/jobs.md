# Jobs API

> **Status**: 🚧 Auto-generated API docs coming in Sprint 1+

## `defineJob<P>(name, config)`

Define a background job with status polling support.

### Type Parameters

- `P` - Parameters type

### Parameters

- `name: string` - Job name (e.g., `IndexThing`)
- `config: JobConfig<P>` - Job configuration

### Config Object

```typescript
{
	enqueue: (params: P) => Promise<void>; // Enqueue the job
	status: (params: P) => Promise<JobStatus>; // Check job status
}
```

### Returns

A job object with:

- `enqueue(params: P)` - Enqueue the job
- `status(params: P)` - Check job status
- `wait(params: P, options?)` - Wait for job completion with polling

### Example

```typescript
export const IndexThing = defineJob('IndexThing', {
	enqueue: (params: { id: number }) => {
		return transport.post('/wpk/v1/jobs/index-thing', params);
	},
	status: (params: { id: number }) => {
		return transport.get(`/wpk/v1/jobs/index-thing/status?id=${params.id}`);
	},
});

// Usage
await IndexThing.enqueue({ id: 123 });
await IndexThing.wait(
	{ id: 123 },
	{
		pollInterval: 1500,
		pollTimeout: 60000,
	}
);
```

## JobStatus Type

```typescript
type JobStatus = {
	status: 'pending' | 'in-progress' | 'completed' | 'failed';
	progress?: number; // 0-100
	error?: string;
	result?: unknown;
};
```
