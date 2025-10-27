[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / definePolicy

# Function: definePolicy()

```ts
function definePolicy<K>(config): PolicyHelpers<K>;
```

Define a policy runtime with declarative capability rules.

Policies provide **type-safe, cacheable capability checks** for both UI and actions.
They enable conditional rendering (show/hide buttons), form validation (disable fields),
and enforcement (throw before writes) - all from a single source of truth.

This is the foundation of **Policy-Driven UI**: Components query capabilities without
knowing implementation details. Rules can leverage WordPress native capabilities
(`wp.data.select('core').canUser`), REST probes, or custom logic.

## What Policies Do

Every policy runtime provides:

- **`can(key, params?)`** - Check capability (returns boolean, never throws)
- **`assert(key, params?)`** - Enforce capability (throws `PolicyDenied` if false)
- **Cache management** - Automatic result caching with TTL and cross-tab sync
- **Event emission** - Broadcast denied events via `@wordpress/hooks` and BroadcastChannel
- **React integration** - `usePolicy()` hook (provided by `@wpkernel/ui`) for SSR-safe conditional rendering
- **Action integration** - `ctx.policy.assert()` in actions for write protection

## Basic Usage

```typescript
import { definePolicy } from '@wpkernel/core/policy';

// Define capability rules
const policy = definePolicy<{
  'posts.view': void;           // No params needed
  'posts.edit': number;         // Requires post ID
  'posts.delete': number;       // Requires post ID
}>({
  'posts.view': (ctx) => {
    // Sync rule: immediate boolean
    return ctx.adapters.wp?.canUser('read', { kind: 'postType', name: 'post' }) ?? false;
  },
  'posts.edit': async (ctx, postId) => {
    // Async rule: checks specific post capability
    const result = await ctx.adapters.wp?.canUser('update', {
      kind: 'postType',
      name: 'post',
      id: postId
    });
    return result ?? false;
  },
  'posts.delete': async (ctx, postId) => {
    const result = await ctx.adapters.wp?.canUser('delete', {
      kind: 'postType',
      name: 'post',
      id: postId
    });
    return result ?? false;
  }
});

// Use in actions (enforcement)
export const DeletePost = defineAction('Post.Delete', async (ctx, { id }) => {
  ctx.policy.assert('posts.delete', id); // Throws if denied
  await post.remove!(id);
  ctx.emit(post.events.deleted, { id });
});

// Use in UI (conditional rendering)
function PostActions({ postId }: { postId: number }) {
  const policy = usePolicy<typeof policy>();
  const canEdit = policy.can('posts.edit', postId);
  const canDelete = policy.can('posts.delete', postId);

  return (
    <div>
      <Button disabled={!canEdit}>Edit</Button>
      <Button disabled={!canDelete}>Delete</Button>
    </div>
  );
}
```

## Caching & Performance

Results are **automatically cached** with:

- **Memory cache** - Instant lookups for repeated checks
- **Cross-tab sync** - BroadcastChannel keeps all tabs in sync
- **Session storage** - Optional persistence (set `cache.storage: 'session'`)
- **TTL support** - Cache expires after configurable timeout (default: 60s)

```typescript
const policy = definePolicy(rules, {
	cache: {
		ttlMs: 30_000, // 30 second cache
		storage: 'session', // Persist in sessionStorage
		crossTab: true, // Sync across browser tabs
	},
});
```

Cache is invalidated automatically when rules change via `policy.extend()`,
or manually via `policy.cache.invalidate()`.

## WordPress Integration

By default, policies auto-detect and use `wp.data.select('core').canUser()` for
native WordPress capability checks:

```typescript
// Automatically uses wp.data when available
const policy = definePolicy({
	'posts.edit': async (ctx, postId) => {
		// ctx.adapters.wp is auto-injected
		const result = await ctx.adapters.wp?.canUser('update', {
			kind: 'postType',
			name: 'post',
			id: postId,
		});
		return result ?? false;
	},
});
```

Override adapters for custom capability systems:

```typescript
const policy = definePolicy(rules, {
	adapters: {
		wp: {
			canUser: async (action, resource) => {
				// Custom implementation (e.g., check external API)
				return fetch(`/api/capabilities?action=${action}`).then((r) =>
					r.json()
				);
			},
		},
		restProbe: async (key) => {
			// Optional: probe REST endpoints for availability
			return fetch(`/wp-json/acme/v1/probe/${key}`).then((r) => r.ok);
		},
	},
});
```

## Event Emission

When capabilities are denied, events are emitted to:

- **`@wordpress/hooks`** - `{namespace}.policy.denied` with full context
- **BroadcastChannel** - Cross-tab notification for UI synchronization
- **PHP bridge** - Optional server-side logging (when `bridged: true` in actions)

```typescript
// Listen for denied events
wp.hooks.addAction('acme.policy.denied', 'acme-plugin', (event) => {
	const reporter = createReporter({
		namespace: 'acme.policy',
		channel: 'all',
	});
	reporter.warn('Policy denied:', event.policyKey, event.context);
	// Show toast notification, track in analytics, etc.
});
```

## Runtime Wiring

Policies are **automatically registered** with the action runtime on definition:

```typescript
// 1. Define policy (auto-registers)
const policy = definePolicy(rules);

// 2. Use in actions immediately
const CreatePost = defineAction('Post.Create', async (ctx, args) => {
	ctx.policy.assert('posts.create'); // Works automatically
	// ...
});
```

For custom runtime configuration:

```typescript
globalThis.__WP_KERNEL_ACTION_RUNTIME__ = {
	policy: definePolicy(rules),
	jobs: defineJobQueue(),
	bridge: createPHPBridge(),
	reporter: createReporter(),
};
```

## Extending Policies

Add or override rules at runtime:

```typescript
policy.extend({
	'posts.publish': async (ctx, postId) => {
		// New rule
		return ctx.adapters.wp?.canUser('publish_posts') ?? false;
	},
	'posts.edit': (ctx, postId) => {
		// Override existing rule
		return false; // Disable editing
	},
});
// Cache automatically invalidated for affected keys
```

## Type Safety

Policy keys and parameters are **fully typed**:

```typescript
type MyPolicies = {
  'posts.view': void;          // No params
  'posts.edit': number;        // Requires number
  'posts.assign': { userId: number; postId: number }; // Requires object
};

const policy = definePolicy<MyPolicies>({ ... });

policy.can('posts.view');           // ✓ OK
policy.can('posts.edit', 123);      // ✓ OK
policy.can('posts.edit');           // ✗ Type error: missing param
policy.can('posts.unknown');        // ✗ Type error: unknown key
```

## Async vs Sync Rules

Rules can be **synchronous** (return `boolean`) or **asynchronous** (return `Promise<boolean>`).
Async rules are automatically detected and cached to avoid redundant API calls:

```typescript
definePolicy({
	map: {
		'fast.check': (ctx) => true, // Sync: immediate
		'slow.check': async (ctx) => {
			// Async: cached
			const result = await fetch('/api/check');
			return result.ok;
		},
	},
});
```

In React components, async rules return `false` during evaluation and update when resolved.

## Type Parameters

### K

`K` _extends_ `Record`\&lt;`string`, `unknown`\&gt;

Policy map type defining capability keys and their parameter types

## Parameters

### config

[`PolicyDefinitionConfig`](../type-aliases/PolicyDefinitionConfig.md)\&lt;`K`\&gt;

Configuration object mapping policy keys to rule functions and runtime options

## Returns

[`PolicyHelpers`](../type-aliases/PolicyHelpers.md)\&lt;`K`\&gt;

Policy helpers object with can(), assert(), keys(), extend(), and cache API

## Throws

DeveloperError if a rule returns non-boolean value

## Throws

PolicyDenied when assert() called on denied capability

## Examples

```typescript
// Minimal example (no params)
const policy = definePolicy({
	map: {
		'admin.access': (ctx) =>
			ctx.adapters.wp?.canUser('manage_options') ?? false,
	},
});

if (policy.can('admin.access')) {
	// Show admin menu
}
```

```typescript
// With custom adapters
const policy = definePolicy({
	map: rules,
	options: {
		namespace: 'acme-plugin',
		adapters: {
			restProbe: async (key) => {
				const res = await fetch(`/wp-json/acme/v1/capabilities/${key}`);
				return res.ok;
			},
		},
		cache: { ttlMs: 5000, storage: 'session' },
		debug: true, // Log all policy checks
	},
});
```
