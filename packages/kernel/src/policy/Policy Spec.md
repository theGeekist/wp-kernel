# Policy Module - Specification (Sprint 3)

> **Status**: 🟡 Sprint 3 - Phase 1: Client Hints (Q4 2025)
>
> **Baseline**: WordPress 6.8+, Node 22+, TypeScript 5.x

---

## Problem & Solution

**Problem:** Permission checks scattered, no client/server contract, no audit trail.

**Solution:** Declarative capability rules + Action guards + audit events.

> ⚠️ **CRITICAL: Client policies are UX hints, NOT security boundaries.**
>
> Phase 1 = predictable UI. Phase 2 = server enforcement.

---

## Golden Path Position

```
Resources → Policies → Actions → Views → Jobs
            ^^^^^^^^
            "Can I?" before "Should I?"
```

- **Resources** define data shape
- **Policies** define capability gates
- **Actions** enforce via `ctx.policy.assert()`
- **Views** conditionally render via `usePolicy().can()`

---

## API Contract

### `definePolicy<Keys>(map, options?)`

**Type-safe policy definition with per-key params:**

```typescript
export type PolicyRule<P = void> = (
	ctx: PolicyContext,
	params: P
) => boolean | Promise<boolean>;

export type PolicyMap<Keys extends Record<string, any>> = {
	[K in keyof Keys]: PolicyRule<Keys[K]>;
};

/** Helper to make params optional for void rules */
type ParamsOf<K, Key extends keyof K> = K[Key] extends void ? [] : [K[Key]];

export function definePolicy<K extends Record<string, any>>(
	map: PolicyMap<K>,
	options?: PolicyOptions
): PolicyHelpers<K>;

export interface PolicyHelpers<K> {
	can<Key extends keyof K>(
		key: Key,
		...params: ParamsOf<K, Key>
	): boolean | Promise<boolean>;
	assert<Key extends keyof K>(
		key: Key,
		...params: ParamsOf<K, Key>
	): void | Promise<void>;
	keys(): (keyof K)[];
	extend(additionalMap: Partial<PolicyMap<K>>): void;
}
```

### **PolicyContext**

```typescript
interface PolicyContext {
	namespace: string; // resolved plugin namespace, e.g. 'acme-jobs'
	adapters: {
		wp?: {
			canUser: (
				action: 'create' | 'read' | 'update' | 'delete',
				resource:
					| { path: string } // REST endpoint, e.g. { path: '/acme/v1/jobs' }
					| { kind: 'postType'; name: string; id?: number } // core-data format
			) => boolean | Promise<boolean>;
		};
		restProbe?: (key: string) => Promise<boolean>;
	};
	cache: PolicyCache; // LRU + BroadcastChannel fan-out
	reporter?: Reporter; // optional diagnostics
}
```

---

**Options:**

```typescript
interface PolicyOptions {
	namespace?: string;
	adapters?: {
		wp?: {
			canUser: (
				action: 'create' | 'read' | 'update' | 'delete',
				resource:
					| { path: string }
					| { kind: 'postType'; name: string; id?: number }
			) => boolean | Promise<boolean>;
		};
		restProbe?: (key: string) => Promise<boolean>;
	};
	cache?: {
		ttlMs?: number; // default 60000 (60s)
		storage?: 'memory' | 'session'; // default 'memory'
		crossTab?: boolean; // default true, uses BroadcastChannel
	};
	debug?: boolean;
}
```

---

### `usePolicy()`

**React hook for UI checks:**

```typescript
interface UsePolicyResult<K> {
	can<Key extends keyof K>(
		key: Key,
		...params: K[Key] extends void ? [] : [K[Key]]
	): boolean;
	keys: (keyof K)[];
	isLoading: boolean;
	error?: Error;
}
```

**Pre-hydration contract:**

- `can()` returns `false` (optimistic deny)
- `isLoading` is `true`
- After hydration: `can()` returns cached sync result, `isLoading` is `false`

---

## Usage Examples

### Type-Safe Policy Map

```typescript
type JobPolicies = {
	'jobs.manage': void; // No params
	'jobs.delete': { id: number }; // Context-aware
	'post.edit': { id: number };
	'beta.enabled': void;
};

export const policy = definePolicy<JobPolicies>(
	{
		'jobs.manage': ({ adapters }) =>
			adapters.wp.canUser('create', { path: '/acme/v1/jobs' }),
		'jobs.delete': ({ adapters }, { id }) =>
			adapters.wp.canUser('delete', { path: `/acme/v1/jobs/${id}` }),
		'post.edit': ({ adapters }, { id }) =>
			adapters.wp.canUser('update', {
				kind: 'postType',
				name: 'post',
				id,
			}),
		'beta.enabled': () => window.__FEATURES__?.beta === true,
	},
	{
		adapters: {
			wp: {
				canUser: (action, resource) =>
					select('core').canUser(action, resource),
			},
		},
	}
);

// TypeScript enforces params
await policy.can('jobs.delete', { id: 42 }); // ✅ Required
await policy.can('jobs.manage'); // ✅ No params needed
await policy.can('jobs.delete'); // ❌ TS error: missing { id }
```

### In Actions

```typescript
defineAction('Job.Delete', async (ctx, { id }) => {
	ctx.policy.assert('jobs.delete', { id }); // Throws if denied
	return await job.remove(id);
});
```

### In UI

```typescript
function JobActions({ job }: { job: Job }) {
	const { can, isLoading } = usePolicy();

	if (isLoading) return <Spinner />;

	return (
		<Button disabled={!can('jobs.delete', { id: job.id })}>
			Delete
		</Button>
	);
}
```

---

## Event Contract

### `{namespace}.policy.denied`

**Payload:**

```typescript
{
	policyKey: string;
	context?: Record<string, unknown>; // params passed to assert()
	requestId?: string; // Present when raised inside Action
	timestamp: number;
	reason?: string; // Optional human-readable reason
	messageKey?: string; // i18n key (e.g., 'policy.denied.jobs.manage')
}
```

**i18n key convention:** `policy.denied.{namespace}.{policyKey}` (e.g., `policy.denied.acme-jobs.jobs.manage`).

**Delivery:** In-process + cross-tab (BroadcastChannel). If BroadcastChannel is unavailable (e.g., Safari Private windows), cross-tab fan-out is skipped; behaviour remains correct within the active tab.

**Bridge:** Async queue to PHP as `{namespace}.bridge.policy.denied`

**Example:**

```typescript
addAction('acme-jobs.policy.denied', 'my-logger', (payload) => {
	console.warn('Denied:', payload.policyKey, payload.reason);
});
```

**Event correlation:** When raised in Action context, includes `requestId` to correlate with `{namespace}.action.error`.

---

### Related Action Events (for correlation)

While this spec focuses on Policies, Actions emit a standard trio of lifecycle events which carry the same `requestId`. Use these to correlate policy denials with action failures in logs and tests.

- `{namespace}.action.start` - `{ actionName: string, args?: unknown, requestId: string, timestamp: number }`
- `{namespace}.action.complete` - `{ actionName: string, result?: unknown, requestId: string, durationMs: number }`
- `{namespace}.action.error` - `{ actionName: string, error: KernelError, requestId: string, durationMs?: number }`

**Contract:** When `ctx.policy.assert()` throws inside an Action, the kernel MUST emit both `{namespace}.policy.denied` and `{namespace}.action.error` with the same `requestId`.

---

## Error Contract

**Thrown by `assert()`:**

```typescript
{
	name: 'KernelError';
	code: 'PolicyDenied';
	message: string; // User-facing English (default)
	messageKey: string; // i18n key (e.g., 'policy.denied.jobs.manage')
	policyKey: string;
	context?: Record<string, unknown>;
	reason?: string; // Optional machine-readable reason
}
```

**Side effects:**

1. Emits `{namespace}.policy.denied`
2. Emits `{namespace}.action.error` (if in Action)
3. Shows user notice (via `messageKey` for i18n)

---

## Integration Points

### Actions Module (No Breaking Changes)

**What changes (internal wiring only):**

- `ActionRuntime.policy` type: `Partial<ActionPolicy>` → `Partial<PolicyHelpers>`
- `createPolicy()` deleted, import `createPolicyProxy()` from Policy module
- Add `import type { PolicyHelpers } from '../policy/types'`

**Action creators unchanged:**

```typescript
// Still works exactly the same
ctx.policy.assert('jobs.manage');
const canDelete = ctx.policy.can('jobs.delete', { id: 42 });
```

### WordPress Adapter (6.7+ baseline)

**Core Data integration:**

Supported selector signatures (WP 6.7+):
select('core').canUser('create', { path: '/acme/v1/jobs' });
select('core').canUser('update', { kind: 'postType', name: 'post', id });
Older signatures are not supported.

```typescript
import { store as coreStore } from '@wordpress/core-data';
import { select } from '@wordpress/data';

adapters: {
	wp: {
		canUser: (action, resource) =>
			select(coreStore).canUser(action, resource);
	}
}
```

**Resource formats:**

- Post types: `{ kind: 'postType', name: 'post', id?: number }`
- REST endpoints: `{ path: '/acme/v1/jobs' }`

**Note:** `canUser` signature stabilized in WP 6.7 (our baseline).

---

## Caching Defaults

**Defaults:** ttlMs = 60000, storage = 'memory', crossTab = true (BroadcastChannel).

**Automatic caching (implementation must provide):**

1. **In-memory LRU** (per tab, 60s TTL)
2. **Cross-tab hydration** via BroadcastChannel
3. **Optional sessionStorage** for async adapters (survives page reload)

**Cache invalidation:**

- Manual: `policy.extend({ key: newRule })` clears cache for that key
- Automatic: 60s TTL
- Event-based: Listen to entity updates, invalidate related keys

**Performance contract:**

- Sync rules: never cache (instant evaluation)
- Async rules: cache for 60s minimum
- Network calls: batch via single REST probe

---

## Composition & Overrides

**Extending policy maps:**

```typescript
const basePolicy = definePolicy({
	'jobs.manage': () => true,
});

// Later, in plugin extension
basePolicy.extend({
	'jobs.manage': () => checkCustomLogic(), // Overrides base
	'custom.action': () => true, // Adds new key
});
```

**Rules:**

- Last-in wins (later keys override earlier)
- Dev warning logged when overriding
- `extend()` clears cache for overridden keys

---

## Supports Flags

### Static Mode

**Constraint:** No network adapters allowed.

```typescript
// ✅ OK
'jobs.manage': () => window.__STATIC_CAPS__?.jobs.manage === true

// ❌ Not allowed
'jobs.manage': ({ adapters }) => adapters.restProbe('jobs.manage')
```

**Hydration:** Server must inject capabilities via `window.__STATIC_CAPS__` on SSR.

- The CLI scaffold emits a static policy stub that reads from `window.__STATIC_CAPS__`.
- A lint rule warns if an async adapter (e.g., `restProbe`) is registered while `supports: 'static'` is enabled.

### Headless Mode

**Constraint:** No WordPress `@wordpress/core-data` dependency.

```typescript
// Prefer REST probe
adapters: {
	restProbe: async (key) => {
		const res = await fetch('/api/me/capabilities');
		const caps = await res.json();
		return !!caps[key];
	};
}
```

---

## Testing Contract

### Unit Tests (≥95% coverage)

Must cover:

- Static rules (sync boolean)
- Async rules (WordPress, REST)
- Param passing (context-aware rules)
- `can()` returns boolean
- `assert()` throws `KernelError('PolicyDenied')`
- Event emission with correct payload
- `keys()` returns all registered keys
- `extend()` overrides and warns

**Contract test (no accidental network):**

```typescript
test('sync deny does not trigger network', async () => {
	const fetchSpy = jest.spyOn(global, 'fetch');
	const policy = definePolicy({ 'test.deny': () => false });

	try {
		await policy.assert('test.deny');
	} catch {
		// Expected
	}

	expect(fetchSpy).not.toHaveBeenCalled();
	fetchSpy.mockRestore();
});
```

### Integration Tests

Must cover:

- `ctx.policy.assert/can` in Actions
- Event emission includes `requestId` when in Action
- Error propagation to `{namespace}.action.error`
- Policy proxy delegates to runtime
- Correlate requestId between `{namespace}.policy.denied` and `{namespace}.action.error` when `assert()` fails inside an Action.

### E2E Tests

Must cover:

- UI buttons disabled when policy denies
- Action throws `PolicyDenied` with correct `messageKey`
- User sees localized notice (via i18n)
- `{namespace}.policy.denied` observable in console

---

## DevTools

### Console Debugging

```typescript
// Enabled via debug: true
policy.keys(); // → ['jobs.manage', 'jobs.delete', ...]

// Console table dump
console.table(
	policy.keys().map((key) => ({
		key,
		allowed: policy.can(key), // Evaluate all
	}))
);
```

### CLI Scaffolding

```bash
gk:make policy JobPolicy

# Generates:
# src/policies/JobPolicy.ts with type-safe starter
```

### Cross-links

- Reporter metrics & sinks: see [[Code Primitives & Dev Tooling PO Draft • v1.0]] § Logging & Reporting.
- Supports flags & scaffolding: see [[Product Specification PO Draft • v1.0]] § 8 and scaffold config.

---

## Definition of Done (Sprint 3)

### Prerequisites: Actions Module Cleanup

**Existing code** (`packages/kernel/src/actions/`):

- `types.ts:157-161` - `ActionPolicy` interface
- `context.ts:232-254` - `createPolicy()` function
- `types.ts:410` - `ActionRuntime.policy?: Partial<ActionPolicy>`

**Changes required:**

- [ ] Delete `ActionPolicy` interface
- [ ] Delete `createPolicy()` function
- [ ] Import `PolicyHelpers` from `../policy/types`
- [ ] Import `createPolicyProxy` from `../policy/context`
- [ ] Update `ActionRuntime.policy` type to `Partial<PolicyHelpers>`
- [ ] Call `createPolicyProxy()` instead of `createPolicy()`

**Risk:** ✅ LOW - Actions tests use mocks, no public API changes

---

### Core Deliverables

**Policy module** (`packages/kernel/src/policy/`):

- [ ] `types.ts` - `PolicyRule<P>`, `PolicyMap<K>`, `PolicyHelpers<K>`, `PolicyContext`, `PolicyOptions`
- [ ] `define.ts` - `definePolicy<K>()` with type-safe key/param mapping
- [ ] `context.ts` - `createPolicyProxy()` (moved from Actions)
- [ ] `hooks.ts` - `usePolicy()` with pre-hydration contract
- [ ] `cache.ts` - LRU cache (60s TTL) + BroadcastChannel hydration
- [ ] `index.ts` - Public API exports

**Event emission:**

- [ ] `{namespace}.policy.denied` with full payload (including `requestId`, `messageKey`)
- [ ] BroadcastChannel cross-tab delivery
- [ ] PHP Bridge queue hook (placeholder)

**WordPress integration:**

- [ ] Adapter for `@wordpress/core-data` (WP 6.7+ baseline)
- [ ] Optional REST probe adapter
- [ ] Batch capability checks (single network call)

---

### Testing (≥95% statements/lines, ≥98% functions)

- [ ] Unit: Static/async rules, params, can/assert, events, extend
- [ ] Unit: Contract test (sync deny = no network)
- [ ] Unit: Pre-hydration behavior (can=false, isLoading=true)
- [ ] Integration: Actions integration, requestId correlation
- [ ] E2E: UI gating, error notices, event observability

---

### Documentation

- [ ] API reference: `definePolicy<K>()`, `PolicyHelpers<K>`, `PolicyOptions`
- [ ] Usage guide: Type-safe policies, WordPress adapter, composition
- [ ] Integration guide: Actions (no breaking changes), UI hooks
- [ ] Security note: Client = UX hints only (callout box)
- [ ] i18n guide: `messageKey` usage for localized errors
- [ ] DevTools: Console debugging, CLI scaffolding

---

### Quality Gates

- [ ] `pnpm typecheck` + `pnpm typecheck:tests` pass
- [ ] `pnpm test` passes (Actions tests still green)
- [ ] `pnpm lint` passes
- [ ] No `any` types
- [ ] Coverage: ≥95%/≥98%
- [ ] Namespace-aware events (no hardcoded `wpk.*`)
      A lint rule forbids invoking adapters directly from Views; UI should use `usePolicy()` exclusively.

---

## Risks & Mitigations

### Risk: N+1 ownership checks in lists

**Problem:** `can('job.update', { id })` in list renders = N network calls.

**Mitigation:**

- Encourage aggregate policies (`jobs.manage` not `job.update`)
- Reserve per-row checks for confirm dialogs only
- Document pattern in usage guide

### Risk: Policy drift (Phase 1 → Phase 2)

**Problem:** Keys change when adding server mirroring.

**Mitigation:**

- Keep keys stable now (e.g., `jobs.manage` maps to `edit_jobs` cap later)
- Avoid complex client logic that can't be server-mirrored
- Document key naming convention (matches PHP capabilities)

---

## Future Scope (Phase 2 - Sprint 9)

### Server Parity

**Adds:**

- PHP Bridge capability handshake
- `permission_callback` mirroring (policy keys → WordPress caps)
- REST 403 validation with structured errors
- Server-side policy registry sync

**Policy definition evolution:**

```typescript
// Phase 1 (current)
'jobs.manage': ({ adapters }) => adapters.wp.canUser('create', {...})

// Phase 2 (future - backwards compatible)
'jobs.manage': {
	client: ({ adapters }) => adapters.wp.canUser('create', {...}),
	server: 'edit_jobs' // PHP capability string
}
```

**No breaking changes** - Phase 1 boolean format still works.

---

## Summary

**What Sprint 3 delivers:**

- Type-safe `definePolicy<K>()` with per-key params
- `ctx.policy.assert/can` in Actions (no breaking changes)
- `usePolicy()` hook with pre-hydration contract
- Namespace-aware events (`{namespace}.policy.denied`)
- WordPress 6.7+ adapter + optional REST probe
- Automatic caching (60s LRU + cross-tab hydration)
- i18n-ready errors (`messageKey` for localization)
- Composition via `extend()` (last-in wins)
- Static/headless mode support

**What it does NOT deliver:**

- ❌ Server enforcement (Phase 2)
- ❌ `permission_callback` mirroring (Phase 2)
- ❌ True security boundaries (Phase 2)

**Key constraints:**

- Client policies = UX hints only
- Namespace-aware (auto-detected, not hardcoded)
- WP 6.7+ baseline for adapter
- ≥95% coverage
- No `any` types

**Implementation timeline:** 2-3 days (incremental migration, tests stay green).
