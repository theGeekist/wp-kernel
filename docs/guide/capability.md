# Capabilities

Capabilities answer the question **“should this feature be available to the current
user?”** before any network request fires. They are declarative capability rules
that Actions enforce and the UI consumes as hints. Phase 1 ships purely on the
client-the server is still the source of truth-so treat capability denials as UX
signals, not security boundaries.

## When to reach for capabilities

Capabilities sit between resources and everything that consumes them:

```
Resources → Capabilities → Actions → Views → Jobs
```

Reach for a capability when:

- multiple Actions need to agree on permission checks,
- the UI should disable or hide affordances when the user lacks access, and
- you want a single place to log and audit denials.

Capabilities work best when the canonical decision still happens on the server.
Client enforcement keeps the interface responsive and predictable while you wait
for the authoritative response.

## Defining capability maps

Use `defineCapability()` to declare a strongly typed map from capability keys to
rule functions. Rules receive a `CapabilityContext` that exposes reporters,
adapters, and the shared cache.

```ts
import { defineCapability } from '@wpkernel/core/capability';

type JobCapabilities = {
	'jobs.manage': void;
	'jobs.delete': { id: number };
	'beta.enabled': void;
};

export const capability = defineCapability<JobCapabilities>({
	map: {
		'jobs.manage': () => true,
		'jobs.delete': ({ adapters }, { id }) =>
			adapters.wp?.canUser('delete', {
				kind: 'postType',
				name: 'job',
				id,
			}) ?? false,
		'beta.enabled': async ({ adapters }) =>
			(await adapters.restProbe?.('beta')) ?? false,
	},
});
```

### Typed parameters

Keys whose value type is `void` automatically become optional parameters when
calling `capability.can()` and `capability.assert()`. Keys with an object payload stay
required and propagate exact property types to callers.

### WordPress adapter detection

If you do not supply a `wp.canUser` adapter, the runtime attempts to reuse
`wp.data.select('core').canUser`. Detection happens once during initialization
and logs a warning if the call fails. Provide a custom adapter when you need to
proxy the decision to a REST endpoint or enforce non-standard permissions.

### Extending capability maps

Call `capability.extend()` to register additional rules at runtime. Re-registering a
key in development prints a console warning and clears any cached value for that
key so React hooks re-evaluate the rule.

```ts
capability.extend({
	'jobs.delete': ({ reporter }, { id }) => {
		reporter?.info('Auditing delete attempt', { id });
		return id % 2 === 0;
	},
});
```

## Enforcing rules inside Actions

The capability helpers automatically attach to the Action runtime. Inside an
Action’s implementation you can synchronously or asynchronously gate behaviour:

```ts
import { defineAction } from '@wpkernel/core/actions';
import { capability } from '@/capability';

export const DeleteJob = defineAction({
	name: 'Job.Delete',
	handler: async (ctx, { id }) => {
		await ctx.capability.assert('jobs.delete', { id });

		await jobsResource.delete({ id });
		ctx.emit('wpk.jobs.deleted', { id });
		ctx.invalidate([['job', 'list']]);
	},
});
```

`assert()` throws a `WPKernelError('CapabilityDenied')` when a rule returns false. The
error includes a structured `context` field, a `messageKey` of the form
`capability.denied.{namespace}.{key}`, and triggers a `{namespace}.capability.denied`
WordPress hook plus a BroadcastChannel message so other tabs hear about the
refusal.

Use `ctx.capability.can()` when you only need a boolean without raising errors.
Both helpers propagate async rules, making it safe to call REST probes or other
asynchronous checks inside the rule body.

## Surfacing state in the UI

Capabilities double as UI hints through the `useCapability()` hook. The hook subscribes
to the shared cache so components stay in sync with Action checks.

```tsx
import { useCapability } from '@wpkernel/ui';

type CapabilityKeys = Parameters<typeof capability.can>[0];

export function DeleteJobButton({ id }: { id: number }) {
	const { can, isLoading, error } = useCapability<CapabilityKeys>();
	const allowed = can('jobs.delete', { id });

	if (error) {
		return <Notice status="error">{error.message}</Notice>;
	}

	return (
		<Button variant="primary" disabled={isLoading || !allowed}>
			Delete job
		</Button>
	);
}
```

### Hydration contract

Before the capability runtime hydrates, `useCapability()` returns:

- `can()` → `false`
- `isLoading` → `true`
- `keys` → `[]`

Once hydration completes the hook returns cached values when available and sets
`isLoading` to `false`. Calling `capability.can()` directly in the browser updates
the cache, which immediately flows into any mounted hooks.

## Cache behaviour and tuning

All capability evaluations run through an LRU cache with a default TTL of 60
seconds. The cache keeps both Action assertions and UI hooks in sync. Configure
it via the `cache` option when defining the capability:

```ts
const capability = defineCapability({
	map,
	options: {
		cache: {
			ttlMs: 5 * 60_000,
			storage: 'session',
			crossTab: true,
		},
	},
});
```

- `ttlMs` sets the default freshness window per entry.
- `storage: 'session'` persists results to `sessionStorage`. Memory storage is
  the default and resets on reload.
- `crossTab` toggles BroadcastChannel fan-out. Disable it when you need
  completely tab-local decisions.

Rules can manually evict cache entries through `ctx.cache.invalidate()` or by
calling `capability.extend()`, which invalidates the affected key automatically.

## Observability and diagnostics

Capabilities emit denial events even when the caller only asked for a boolean. The
payload includes the capability key, sanitized params, request id (when available),
and a timestamp. Listen to `{namespace}.capability.denied` through `wp.hooks` or a
BroadcastChannel named `wpk.capability.events` to aggregate audit logs.

Enable debug logging by passing `{ debug: true }` when defining the capability. The
runtime then prints structured `info`, `warn`, and `error` messages that mirror
the Action reporter surface.

## Phase 2 outlook

Phase 1 capabilities are UX hints. Future sprints will extend the same definitions
to server enforcement so that Actions and REST routes share a single capability
map. Designing capabilities now keeps the migration path straightforward once the
server contract arrives.
