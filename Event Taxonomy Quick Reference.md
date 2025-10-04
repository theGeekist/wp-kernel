# WP Kernel Event Taxonomy - Quick Reference

> **Related Documentation**: See [[Actions]] for the write-path orchestration layer that emits these events.

## Problem Statement

An Event Taxonomy is essential for maintaining consistency, traceability, and reliability across the WP Kernel ecosystem. By defining a clear and standardized naming convention, payload structure, and bridge guarantees, developers can confidently emit, listen to, and bridge events between JavaScript and PHP environments. This taxonomy ensures predictable event flow, facilitates debugging, and supports robust integrations through ### JavaScript: Emit Custom Domain Event (🚧 Planned - defineAction)

> **Current Workaround**: Use plain async functions instead of `defineAction()`

````typescript
// 🚧 Planned for Sprint 4: defineAction()
import { doAction } from '@wordpress/hooks';
import { defineAction } from '@geekist/wp-kernel/actions';
import { defineResource } from '@geekist/wp-kernel';

const application = defineResource<Application>({
	name: 'application',
	routes: {
		/* ... */
	},
});

// In your action - emit using resource events
export const SubmitApplication = defineAction(
	'Application.Submit',
	async ({ data }) => {acts.

## Architecture: Resources Define Events, Actions Emit Them

> **Implementation Status**: See [[Actions]] for full details on the Actions layer (Sprint 4).
> - ✅ **Available Now**: `defineResource()` with `resource.events.*` properties
> - 🚧 **Sprint 4**: `defineAction()` wrapper for orchestration

**Core Principle**: In WP Kernel, **resources are the source of truth for domain events**. Actions orchestrate business logic and emit these resource-defined events.

```typescript
import { defineResource } from '@geekist/wp-kernel';
import { doAction } from '@wordpress/hooks';

// 1. Resource defines events (namespace auto-detected from plugin)
const job = defineResource<Job>({
	name: 'job',
	routes: {
		/* ... */
	},
});

// Events are available at:
job.events.created; // → 'acme-jobs.job.created'
job.events.updated; // → 'acme-jobs.job.updated'
job.events.removed; // → 'acme-jobs.job.removed'

// 2. Actions emit these resource events
// ✅ Available now (plain function):
export async function CreateJob({ data }) {
	const result = await job.create(data);

	// Emit the resource's event (not a custom action event)
	doAction(job.events.created, { id: result.id, data: result });

	return result;
}

// 🚧 Sprint 4: defineAction() wrapper
import { defineAction } from '@geekist/wp-kernel/actions';
export const CreateJob = defineAction('Job.Create', async ({ data }) => {
	const result = await job.create(data);
	doAction(job.events.created, { id: result.id, data: result });
	return result;
});
```

**Why This Matters**:

- ✅ **Single source of truth**: One place defines event names (the resource)
- ✅ **Namespace consistency**: All events from a resource share the same namespace
- ✅ **Type safety**: TypeScript can infer event names from resource definitions
- ✅ **Discoverability**: `resource.events.*` makes events explicit and documented

For orchestration details (cache invalidation, policy checks, job queuing), see [[Actions]].

## Event Naming Convention

```typescript
{namespace}.{domain}.{action}
```

- **namespace** = plugin/product namespace (auto-detected or configured via `@geekist/wp-kernel/namespace`)
- **domain** = resource, action, policy, job, ui, error, or custom domain
- **action** = created, updated, deleted, start, complete, error, etc.

### Namespace Auto-Detection

WP Kernel automatically detects the appropriate namespace for your application using the `detectNamespace()` function from `@geekist/wp-kernel/namespace`:

1. **Auto-detected** (90% case): `acme-jobs.job.created` (from plugin slug via WordPress plugin headers)
2. **Explicit override** (9% case): Custom namespace in resource definition
3. **Framework default** (1% case): `wpk.*` for framework-internal events

**Examples**:

```typescript
import { defineResource } from '@geekist/wp-kernel';

// Plugin: "ACME Jobs Pro" → namespace auto-detected as "acme-jobs"
const job = defineResource<Job>({
	name: 'job',
	routes: {
		/* ... */
	},
});
console.log(job.events.created); // → 'acme-jobs.job.created'
console.log(job.events.updated); // → 'acme-jobs.job.updated'
console.log(job.events.removed); // → 'acme-jobs.job.removed'

// Explicit namespace override
const customJob = defineResource<Job>({
	name: 'job',
	namespace: 'enterprise',
	routes: {
		/* ... */
	},
});
console.log(customJob.events.created); // → 'enterprise.job.created'

// Shorthand syntax: namespace:name
const task = defineResource<Task>({
	name: 'acme:task',
	routes: {
		/* ... */
	},
});
console.log(task.events.created); // → 'acme.task.created'
```

### How Resources Define Events

**All domain events are defined by resources**, not actions. Actions use the events from their associated resource:

```typescript
import { defineResource } from '@geekist/wp-kernel';
import { doAction } from '@wordpress/hooks';

// Resource defines events
const job = defineResource<Job>({
	name: 'job',
	routes: {
		/* ... */
	},
});

// Actions emit resource events
export const CreateJob = defineAction('Job.Create', async ({ data }) => {
	const created = await job.create(data);

	// Emit resource's event (auto-namespaced)
	doAction(job.events.created, { id: created.id, data: created });

	return created;
});
```

## Event Scope

> **Status**: 🚧 **Planned for Sprint 4+**

Events in the WP Kernel ecosystem **will support** scoping either per-tab (tab-local) or cross-tab (shared across all browser tabs). By default, events will be broadcasted cross-tab using the `BroadcastChannel` API, enabling real-time synchronization and communication between multiple tabs of the same origin.

Developers will have control over event scope and can specify whether an event should be tab-local only. This escape hatch will be useful for cases where event isolation per tab is desired, preventing the event from being propagated to other tabs.

The scope will typically be configured via an option when creating the event bus or defining an action, allowing explicit choice between cross-tab broadcasting (default) and tab-local emission.

**Current Status**: Currently, all events are emitted via `@wordpress/hooks` `doAction()` without cross-tab broadcasting. BroadcastChannel integration is planned for Sprint 4.

## System Events (Auto-emitted by Kernel)

> **Note on Namespacing**: System events use the `wpk` namespace as they are emitted by the framework itself, not by user resources. User resources emit namespaced domain events (see Domain Events section).

### Transport Events

```typescript
// Before REST call
'wpk.resource.request': {
  resourceName: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  params?: Record<string, unknown>;
  requestId: string;
}

// After successful response
'wpk.resource.response': {
  resourceName: string;
  method: string;
  path: string;
  status: number;
  data: unknown;
  requestId: string;
}

// On transport/server error (BRIDGED ASYNC)
'wpk.resource.error': {
  resourceName: string;
  error: KernelError;
  requestId: string;
}

// During retry attempts
'wpk.resource.retry': {
  resourceName: string;
  attempt: number;
  nextDelay: number;
  error: KernelError;
  requestId: string;
}
```

### Action Events

```typescript
// Action started
'wpk.action.start': {
  actionName: string;
  args: unknown;
  requestId: string;
}

// Action completed
'wpk.action.complete': {
  actionName: string;
  result: unknown;
  requestId: string;
}

// Action failed (BRIDGED ASYNC)
'wpk.action.error': {
  actionName: string;
  error: KernelError;
  requestId: string;
}
```

### Policy Events

```typescript
// Client policy check failed (BRIDGED ASYNC)
'wpk.policy.denied': {
  policyKey: string;
  context?: Record<string, unknown>;
}
```

### Cache Events

```typescript
// Cache invalidation triggered
'wpk.cache.invalidated': {
  keys: string[];
}
```

### Job Events

```typescript
// Job queued (BRIDGED SYNC)
'wpk.job.enqueued': {
  jobName: string;
  params: Record<string, unknown>;
  jobId: string;
}

// Job completed (BRIDGED ASYNC)
'wpk.job.completed': {
  jobName: string;
  jobId: string;
  result: unknown;
}

// Job failed (BRIDGED ASYNC)
'wpk.job.failed': {
  jobName: string;
  jobId: string;
  error: KernelError;
}
```

### Error Events

```typescript
// Any KernelError thrown
'wpk.error': {
  error: KernelError;
  context?: Record<string, unknown>;
}

// Deprecated API used (dev only)
'wpk.deprecated': {
  api: string;
  version: string;
  alternative: string;
}
```

## Domain Events (Application-Defined)

> **Namespace Awareness**: Domain events are automatically namespaced based on the resource definition. The namespace is detected from your plugin context (see `@geekist/wp-kernel/namespace`). Actions emit these events using the resource's `.events` property.

### CRUD Pattern

```typescript
// Resource created (BRIDGED SYNC)
'{namespace}.{resource}.created': {
  id: number | string;
  data: Partial<Resource>;
}

// Resource updated (BRIDGED SYNC)
'{namespace}.{resource}.updated': {
  id: number | string;
  data: Partial<Resource>;
  prev?: Partial<Resource>;  // optional: previous values
}

// Resource deleted (BRIDGED SYNC)
'{namespace}.{resource}.removed': {
  id: number | string;
  data?: Partial<Resource>;  // optional: deleted data
}
```

**Example with actual namespace**:

```typescript
import { defineResource } from '@geekist/wp-kernel';

// Plugin: "ACME Jobs" (slug: acme-jobs)
const job = defineResource<Job>({
	name: 'job',
	routes: {
		/* ... */
	},
});

// Events are auto-namespaced:
job.events.created; // → 'acme-jobs.job.created'
job.events.updated; // → 'acme-jobs.job.updated'
job.events.removed; // → 'acme-jobs.job.removed'

// Actions use these events:
export const CreateJob = defineAction('Job.Create', async ({ data }) => {
	const result = await job.create(data);
	doAction(job.events.created, { id: result.id, data: result });
	return result;
});
```

### Custom Domain Events

> **See [[Actions]] for orchestration patterns**. Custom events are emitted by Actions, not Resources.

Beyond CRUD, you can define custom domain events following the same namespace pattern:

> **Note**: Examples below use `defineAction()` (Sprint 4). Current workaround: use plain async functions.

```typescript
// Example: Application status change (OPTIONAL BRIDGE)
'{namespace}.application.statusChanged': {
  applicationId: number;
  jobId: number;
  fromStatus: string;
  toStatus: string;
  changedBy: number;
  timestamp: string;
}

// Example: Job application received
'{namespace}.job.applicationReceived': {
  jobId: number;
  applicationId: number;
  source: 'site' | 'referral' | 'agency';
}
```

**Concrete example**:

```typescript
import { doAction } from '@wordpress/hooks';

// Plugin namespace: "acme-jobs"
export const ChangeApplicationStatus = defineAction(
	'Application.ChangeStatus',
	async ({ applicationId, newStatus }) => {
		const prev = await application.fetch(applicationId);
		const updated = await application.update(applicationId, {
			status: newStatus,
		});

		// Emit custom domain event (manually namespaced)
		doAction('acme-jobs.application.statusChanged', {
			applicationId,
			jobId: updated.jobId,
			fromStatus: prev.status,
			toStatus: newStatus,
			changedBy: getCurrentUserId(),
			timestamp: new Date().toISOString(),
		});

		return updated;
	}
);
```

## UI Extension Events

```typescript
// View mounted
'wpk.ui.viewMounted': {
  viewName: string;
  props: Record<string, unknown>;
}

// View unmounted
'wpk.ui.viewUnmounted': {
  viewName: string;
}

// SlotFill registered
'wpk.ui.slotFilled': {
  slotName: string;
  fillName: string;
}
```

## PHP Bridge Mapping

### How to Listen in PHP

#### Sync Events (runs immediately, blocks JS):

```php
add_action('wpk.bridge.thing.created', function($payload) {
    // $payload is associative array
    $id = $payload['id'];
    $data = $payload['data'];

    // Send email, update cache, log, etc.
    // MUST complete in < 100ms
}, 10, 1);
```

#### Async Events (queued via Action Scheduler):

```php
add_action('wpk.bridge.job.failed', function($payload) {
    // Runs in background within 60s
    // Won't block client
    error_log('Job failed: ' . $payload['jobName']);
    notify_admin($payload);
}, 10, 1);
```

### Bridge Guarantees

| Guarantee           | Details                                   |
| ------------------- | ----------------------------------------- |
| **Payload Format**  | JSON-serializable associative arrays only |
| **Sync Budget**     | < 100ms execution time enforced           |
| **Async Queue**     | Processed within 60s (configurable)       |
| **Error Isolation** | PHP hook failure won't crash JS action    |
| **Correlation ID**  | Available as `$payload['requestId']`      |

> **Note:** Only cross-tab events are bridged to PHP. Events that are scoped as tab-local (per-tab) are never bridged.

### Which Events Are Bridged?

Refer to "Bridged to PHP?" column in main event registry:

**Always Bridged (System Events - `wpk.*` namespace):**

- ✅ `wpk.resource.error` (async)
- ✅ `wpk.action.error` (async)
- ✅ `wpk.policy.denied` (async)
- ✅ `wpk.job.enqueued` (sync)
- ✅ `wpk.job.completed` (async)
- ✅ `wpk.job.failed` (async)

**Always Bridged (Domain Events - `{namespace}.*`):**

- ✅ `{namespace}.{resource}.created` (sync) - e.g., `acme-jobs.job.created`
- ✅ `{namespace}.{resource}.updated` (sync) - e.g., `acme-jobs.job.updated`
- ✅ `{namespace}.{resource}.removed` (sync) - e.g., `acme-jobs.job.removed`

**Never Bridged:**

- ❌ `wpk.resource.request`
- ❌ `wpk.resource.response`
- ❌ `wpk.resource.retry`
- ❌ `wpk.action.start`
- ❌ `wpk.action.complete`
- ❌ `wpk.cache.invalidated`
- ❌ `wpk.error` (too noisy)
- ❌ `wpk.deprecated` (dev only)
- ❌ All UI events

## Usage Examples

> **For Actions Layer Orchestration**: See [[Actions]] for complete patterns including cache invalidation, policy checks, and job queuing.
>
> **Implementation Status**:
>
> - ✅ **Available Now**: `defineResource()`, `resource.events.*`, WordPress hooks, `wpk.resource.*`, `wpk.cache.invalidated`
> - 🚧 **Sprint 4 (Actions Layer)**: `defineAction()`, `addTypedAction()`, `wpk.action.*`, BroadcastChannel

### JavaScript: Listen to Event (✅ Available Now)

```typescript
import { addAction } from '@wordpress/hooks';
import { defineResource } from '@geekist/wp-kernel';

// Define resource (namespace auto-detected from plugin)
const thing = defineResource<Thing>({
	name: 'thing',
	routes: {
		/* ... */
	},
});

// Track analytics using resource events
addAction(thing.events.created, 'my-plugin/analytics', (payload) => {
	track('thing_created', {
		id: payload.id,
		timestamp: Date.now(),
	});
});

// Show notification for action errors (system event)
addAction('wpk.action.error', 'my-plugin/ui', (payload) => {
	showNotice(
		`Action ${payload.actionName} failed: ${payload.error.message}`,
		'error'
	);
});
```

### JavaScript: Emit Custom Event

> **See [[Actions]]** for complete orchestration examples with cache invalidation, policy checks, and job queuing.

```typescript
import { doAction } from '@wordpress/hooks';
import { defineResource } from '@geekist/wp-kernel';

const application = defineResource<Application>({
	name: 'application',
	routes: { /* ... */ },
});

// ✅ Available now: Plain async function
export async function SubmitApplication({ data }) {
	const result = await application.create(data);

	// Emit standard CRUD event
	doAction(application.events.created, {
		id: result.id,
		data: result,
	});

	// Emit custom domain event
	const namespace = application.events.created.split('.')[0];
	doAction(`${namespace}.application.submitted`, {
		applicationId: result.id,
		jobId: data.jobId,
		source: 'career-site',
	});

	return result;
}

// 🚧 Sprint 4: defineAction() wrapper
import { defineAction } from '@geekist/wp-kernel/actions';
export const SubmitApplication = defineAction('Application.Submit', async ({ data }) => {
	const result = await application.create(data);
	doAction(application.events.created, { id: result.id, data: result });
	const namespace = application.events.created.split('.')[0];
	doAction(`${namespace}.application.submitted`, {
		applicationId: result.id,
		jobId: data.jobId,
		source: 'career-site',
	});
	return result;
});
```

### PHP: Listen to Bridge Events (🚧 Sprint 9)
);
```

**✅ Current Workaround (Available Now)**:

```typescript
// Plain async function without defineAction wrapper
export async function SubmitApplication({ data }) {
	const result = await application.create(data);

	// Resource events work now
	doAction(application.events.created, {
		id: result.id,
		data: result,
	});

	// Custom domain events work now (extract namespace manually)
	const namespace = application.events.created.split('.')[0];
	doAction(`${namespace}.application.submitted`, {
		applicationId: result.id,
		jobId: data.jobId,
		source: 'career-site',
	});

	return result;
}
```

### PHP: Listen to Bridge Events (🚧 Planned - Sprint 9)

````

### TypeScript: Type-Safe Hooks

```typescript
import { addTypedAction } from '@geekist/wp-kernel/events';
import { defineResource } from '@geekist/wp-kernel';

const thing = defineResource<Thing>({
	name: 'thing',
	routes: {
		/* ... */
	},
});

// Full type safety with resource events
addTypedAction(thing.events.created, 'my-plugin', (payload) => {
	// payload.id is typed as number
	// payload.data is typed as Partial<Thing>
	console.log(`Thing ${payload.id} created`);
});
```

### PHP: Extend via Bridge

```php
// Listen to namespaced domain event
// Plugin namespace "acme-jobs" → event "acme-jobs.application.created"
add_action('wpk.bridge.acme-jobs.application.created', function($payload) {
    $webhook_url = get_option('slack_webhook_url');

    wp_remote_post($webhook_url, [
        'body' => json_encode([
            'text' => sprintf(
                'New application received for job #%d',
                $payload['data']['jobId']
            )
        ])
    ]);
}, 10, 1);

// Listen to namespaced CRUD event (sync - runs immediately)
// Plugin namespace "acme-jobs" → event "acme-jobs.job.created"
add_action('wpk.bridge.acme-jobs.job.created', function($payload) {
    global $wpdb;

    $wpdb->insert('job_analytics', [
        'job_id' => $payload['id'],
        'created_at' => current_time('mysql')
    ]);
    // MUST complete in < 100ms
}, 10, 1);

// System events use wpk.* namespace (always)
add_action('wpk.bridge.job.failed', function($payload) {
    // Runs in background within 60s
    error_log('Job failed: ' . $payload['jobName']);
    notify_admin($payload);
}, 10, 1);
```

**Important**: The PHP bridge adds `wpk.bridge.` prefix to all events. Domain events retain their namespace:

- JS: `acme-jobs.job.created` → PHP: `wpk.bridge.acme-jobs.job.created`
- JS: `wpk.action.error` → PHP: `wpk.bridge.action.error` (system event)

## Versioning Rules

### Stable Contract (within major version)

- ✅ **Can Add**: New events, new payload fields
- ❌ **Cannot Remove**: Events, payload fields
- ❌ **Cannot Rename**: Events, payload fields
- ❌ **Cannot Change**: Payload types

### Major Version Changes

- Events can be removed (with full deprecation cycle)
- Payload fields can be removed/renamed
- Bridge mapping can change

### Deprecation Process

1. **Minor N**: Emit `wpk.deprecated` when old event used
2. **Minor N**: Document alternative in changelog
3. **Minor N+1**: Warning in console (dev mode)
4. **Major N+1**: Remove old event completely

## Best Practices

### ✅ DO

- Use canonical events for standard CRUD operations
- Namespace custom events with your domain
- Keep payloads JSON-serializable
- Document custom events in your README
- Use TypeScript types for compile-time safety
- Emit events AFTER successful operations

### ❌ DON'T

- Mutate payload objects (treat as immutable)
- Throw errors from event listeners (catch and log)
- Perform long-running sync operations in PHP bridge
- Emit events for internal/debug purposes (use logging)
- Include sensitive data in event payloads (PII, tokens)
- Create event name collisions with system events

## Debugging Events

### Log All Events (Dev Mode)

```javascript
import { addAction } from '@wordpress/hooks';

if (process.env.NODE_ENV === 'development') {
	// Log every kernel event
	addAction('wpk.*', 'debug', (payload, eventName) => {
		console.group(`🎯 ${eventName}`);
		console.table(payload);
		console.groupEnd();
	});
}
```

### Monitor Bridge Events (PHP)

```php
// In mu-plugins or dev plugin
if (WP_DEBUG) {
    add_action('all', function($hook) {
        if (strpos($hook, 'wpk.bridge.') === 0) {
            error_log("Bridge event: $hook");
            error_log(print_r(func_get_args(), true));
        }
    }, 1);
}
```

## References

- **Full Documentation**: `Product Specification PO Draft • v1.0.md` (Section 4.6)
- **Implementation**: `packages/kernel/src/events/` (upcoming Sprint 4)
- **Namespace Module**: `packages/kernel/src/namespace/` - Auto-detection, validation, and resolution
- **Resource Definition**: `packages/kernel/src/resource/define.ts` - Where events are generated
- **Type Definitions**: `packages/kernel/types/events.d.ts` (generated)
- **Bridge Source**: `packages/kernel/php/class-event-bridge.php` (Sprint 9)

## Namespace Detection Priority

The namespace auto-detection follows this cascade (see `@geekist/wp-kernel/namespace`):

1. **Explicit namespace parameter** in `defineResource({ namespace: 'custom' })`
2. **Shorthand syntax** in `defineResource({ name: 'custom:resource' })`
3. **Build-time defines** (`__WPK_NAMESPACE__`, `import.meta.env.WPK_NAMESPACE`)
4. **Module ID extraction** (Script Modules pattern: `wpk/my-plugin` → `my-plugin`)
5. **WordPress plugin header** 'Text Domain' field
6. **package.json** 'name' field
7. **Fallback** to `'wpk'` (framework default)

For detailed detection rules, see `packages/kernel/src/namespace/detect.ts`.

## Contact

For further information or clarifications, please refer to the main Product Specification or reach out via the team communication channels.
