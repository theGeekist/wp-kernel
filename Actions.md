# Actions Layer (Sprint 4)

> **Related Documentation**:
>
> - See [[Event Taxonomy Quick Reference]] for complete event naming conventions, payloads, and PHP Bridge details
> - See [[Roadmap PO • v1.0]] § Sprint 4 for implementation timeline

**The Actions layer** is the canonical write-path orchestration layer in WP Kernel. Think of it as the "control tower" that sits between your UI and your Resources.

---

## Implementation Status

> **Status**: 🚧 Planned for Sprint 4
>
> - ✅ **Foundation Available**: `defineResource()`, `resource.events.*`, cache invalidation via `invalidate()`
> - 🚧 **Sprint 4**: `defineAction()` wrapper, `wpk.action.*` system events, typed event helpers

---

## The Core Principle

- **UI never talks to the transport directly.**
- Instead, all writes, mutations, and side-effects go through **Actions**.
- Reads can flow directly from Resources (via stores and selectors), but writes must go through Actions.

This makes Actions the **canonical write-path orchestration layer**.

---

## The `defineAction()` API

### Type Signature

```typescript
type ActionFn<Args, Result> = (
	ctx: ActionContext,
	args: Args
) => Promise<Result>;

interface ActionContext {
	/** Request ID shared with resource transport for correlation */
	requestId: string;

	/** Emit events with automatic scoping (wraps doAction + BroadcastChannel) */
	emit: (eventName: string, payload: unknown) => void;

	/** Invalidate cache keys (resource-aware patterns) */
	invalidate: (...keys: CacheKeyPattern[]) => void;

	/** Job queue integration */
	jobs: {
		enqueue: <T>(jobName: string, payload: T) => Promise<void>;
		wait: <T, R>(
			jobName: string,
			payload: T,
			opts?: WaitOptions
		) => Promise<R>;
	};

	/** Policy enforcement */
	policy: {
		/** Assert capability (throws PolicyDenied if failed) */
		assert: (key: string) => void;
		/** Check capability (returns boolean) */
		can: (key: string) => boolean;
	};

	/** Structured logging */
	reporter: Reporter;

	/** Resolved plugin namespace */
	namespace: string;
}

export function defineAction<Args, Result>(
	actionName: string,
	fn: ActionFn<Args, Result>,
	opts?: {
		/** Event scope: 'crossTab' (default) or 'tabLocal' */
		scope?: 'crossTab' | 'tabLocal';
		/** Whether to bridge events to PHP (default: false for tab-local, true for cross-tab) */
		bridged?: boolean;
	}
): (args: Args) => Promise<Result>;
```

**Scope Rules**:

- **Default**: `crossTab` — events broadcast across all tabs via BroadcastChannel
- **Escape hatch**: `tabLocal` — events stay within the current tab only
- **Bridge rule**: Tab-local events are **never bridged to PHP**, regardless of `bridged` option

---

### Example: Happy Path

```typescript
import { defineAction } from '@geekist/wp-kernel/actions';
import { defineResource } from '@geekist/wp-kernel';

const job = defineResource<Job>({
	name: 'job',
	routes: {
		/* ... */
	},
});

export const CreateJob = defineAction<{ data: Job }, Job>(
	'Job.Create',
	async (ctx, { data }) => {
		// 1. Check permissions
		ctx.policy.assert('jobs.manage');

		// 2. Create the resource
		const created = await job.create(data);

		// 3. Emit resource event
		ctx.emit(job.events.created, { id: created.id, data: created });

		// 4. Invalidate related caches
		ctx.invalidate(job.cacheKeys.list({}));

		// 5. Enqueue background job
		await ctx.jobs.enqueue('IndexJob', { id: created.id });

		// 6. Log success
		ctx.reporter.info(`Job ${created.id} created`);

		return created;
	}
);
```

### Example: Policy Denied Flow

```typescript
import { KernelError } from '@geekist/wp-kernel/error';

export const DeleteJob = defineAction<{ id: number }, void>(
	'Job.Delete',
	async (ctx, { id }) => {
		// Will throw PolicyDenied if user lacks permission
		ctx.policy.assert('jobs.delete');

		await job.remove(id);

		ctx.emit(job.events.removed, { id });
		ctx.invalidate(job.cacheKeys.get(id), job.cacheKeys.list({}));
	}
);

// On error, kernel automatically:
// 1. Emits wpk.action.error with { actionName, error, requestId }
// 2. Pushes user notice based on error severity
// 3. Rejects promise with KernelError subclass
```

---

::: tip **Current Workaround (Sprint 1 Foundation)**

Until `defineAction()` ships, use plain async functions:

```typescript
import { invalidate } from '@geekist/wp-kernel/resource';
import { defineResource } from '@geekist/wp-kernel';
import { doAction } from '@wordpress/hooks';
import { can } from '@/policies';

const job = defineResource<Job>({
	name: 'job',
	routes: {
		/* ... */
	},
});

export async function CreateJob({ data }) {
	if (!can('jobs.manage')) throw new Error('No permission');

	const created = await job.create(data);

	doAction(job.events.created, { id: created.id, data: created });
	invalidate([job.cacheKeys.list({})]);

	return created;
}
```

:::

---

## What Actions Do

### 1. Orchestrate Writes

- Wrap calls to `resource.create/update/remove`
- Enforce policies (capability checks)
- Emit domain events using the resource's `.events` property
- Trigger cache invalidation
- Optionally enqueue Jobs for background processing

> **Event Details**: See [[Event Taxonomy Quick Reference]] for complete event naming, payloads, and bridge guarantees.

**Key Point**: Actions don't define their own event names. They emit events defined by their associated resource, which are automatically namespaced based on your plugin context.

### 2. Emit & Listen to Events

- Every Action can emit events using the resource's `.events` property
- Extensions or analytics can hook into them (`addAction(job.events.created, …)`)
- The **event taxonomy** becomes the lingua franca of your plugin
- Events are automatically namespaced based on your plugin context

> **Event Details**: See [[Event Taxonomy Quick Reference]] for:
>
> - Complete event naming conventions (`{namespace}.{domain}.{action}`)
> - Standard payload structures for CRUD and system events
> - PHP Bridge guarantees (sync/async, timing budgets, error isolation)
> - BroadcastChannel scoping (cross-tab vs tab-local)

### 3. Invalidate Caches

After a mutation, Actions know which cached queries are stale and call `ctx.invalidate()`.

**Invalidation Recipes**:

| Mutation | Keys to Invalidate                 | Example                                                        |
| -------- | ---------------------------------- | -------------------------------------------------------------- |
| Create   | `list(*)` variants                 | `ctx.invalidate(resource.cacheKeys.list({}))`                  |
| Update   | `get(id)` + affected `list(query)` | `ctx.invalidate(resource.cacheKeys.get(id), ['thing','list'])` |
| Remove   | `get(id)` + `list(*)`              | Same as Update                                                 |

### 4. Enforce Policies

- Client-side hints: `ctx.policy.can('jobs.manage')`
- Server-side confirmation: REST `permission_callback`
- Actions become the **single place** where capability enforcement is applied consistently

### 5. Coordinate Background Jobs

- Offload long-running work to the Jobs layer (`ctx.jobs.enqueue('IndexJob', { id })`)
- Provide polling/wait ergonomics so UI can react gracefully (`ctx.jobs.wait(...)`)

---

## Error Propagation & Notices

**Contract**:

- Actions **always reject** with `KernelError` subclasses (never plain `Error` or strings)
- Kernel automatically emits `wpk.action.error` with `{ actionName, error, requestId }`
- If the caller doesn't suppress the error, a user-notice is pushed with severity derived from the error kind:
    - `PolicyDenied` → warning notice
    - `TransportError` → error notice
    - `ValidationError` → info notice with field details

This ensures consistent error UX across all Actions without per-component error handling.

---

## Anti-Patterns

❌ **Don't do this**:

- **UI calling `resource.create/update/remove` directly** — Always route writes through Actions (lint rule + runtime warning in dev mode)
- **Emitting arbitrary event strings** — Always use `resource.events.*` for CRUD events; custom domain events should follow `{namespace}.{domain}.{action}` pattern
- **Throwing raw strings or plain `Error`** — Must throw `KernelError` subclasses for proper error handling and notices

---

## Bridge Payload Hygiene

**Rule**: When emitting domain events that will bridge to PHP, strip PII and pass identifiers only.

```typescript
// ❌ Bad: Exposing full user data in bridged event
ctx.emit('acme-jobs.application.submitted', {
	applicationId: result.id,
	applicantData: result.applicant, // Contains email, phone, resume URL
});

// ✅ Good: Identifiers only, let PHP fetch details if needed
ctx.emit('acme-jobs.application.submitted', {
	applicationId: result.id,
	applicantId: result.applicant.id,
	jobId: result.jobId,
	source: 'career-site',
});
```

---

## Namespace Resolution

**Quick Reference** (see [[Event Taxonomy Quick Reference]] for full cascade):

```
explicit namespace → name shorthand (acme:job) → build define → script module id → plugin "Text Domain" → pkg name → wpk
```

Access resolved namespace: `ctx.namespace` inside Actions, or `import { getNamespace } from '@geekist/wp-kernel/namespace'`.

---

## Testing Actions

### Unit Tests

Call the returned action with a mock `ActionContext`:

```typescript
import { createTestActionContext } from '@geekist/wp-kernel/testing';

test('CreateJob emits event and invalidates cache', async () => {
	const ctx = createTestActionContext();
	const mockJob = { id: 1, title: 'Engineer' };

	// Mock resource call
	vi.spyOn(job, 'create').mockResolvedValue(mockJob);

	await CreateJob({ data: mockJob });

	expect(ctx.emit).toHaveBeenCalledWith(job.events.created, {
		id: 1,
		data: mockJob,
	});
	expect(ctx.invalidate).toHaveBeenCalledWith(job.cacheKeys.list({}));
});
```

### Integration Tests

Use MSW for REST, assert `wpk.action.*` and domain events:

```typescript
import { addAction } from '@wordpress/hooks';

test('CreateJob emits wpk.action.complete', async () => {
	const events = [];
	addAction('wpk.action.complete', 'test', (payload) => {
		events.push(payload);
	});

	await CreateJob({ data: { title: 'Engineer' } });

	expect(events).toContainEqual(
		expect.objectContaining({ actionName: 'Job.Create' })
	);
});
```

### E2E Tests

Assert notices and cache invalidation effects in the UI:

```typescript
test('create job shows success notice and updates list', async ({
	page,
	kernel,
}) => {
	await page.goto('/admin/jobs');
	await page.click('[data-action="create-job"]');

	// Wait for action to complete
	await kernel.actions.waitFor('Job.Create');

	// Assert notice
	await expect(page.locator('.notice-success')).toContainText('Job created');

	// Assert cache invalidation triggered re-render
	await expect(page.locator('[data-job-id="1"]')).toBeVisible();
});
```

---

## Why Actions Exist

- **Separation of Concerns**: UI renders → Actions orchestrate → Resources transport → Policies enforce → Jobs background
- **Testability**: You can unit test an Action in isolation — no DOM, no fetch mocks, just business logic
- **Extensibility**: Third-party plugins can hook into canonical events, not random REST calls
- **Consistency**: Every mutation (create/update/delete) looks the same across Resources

---

## Analogy

Think of Resources as your **database models**, and Actions as your **service layer**:

- Resources know _how_ to talk to REST
- Actions decide _when and why_ that should happen

---

⚡ **In short**: The Actions layer is the write-path orchestration surface. It coordinates permissions, REST calls, cache invalidation, events, and jobs — so your UI stays declarative and dumb, while your business logic remains centralised, testable, and extensible.
