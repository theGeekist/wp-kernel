# Capability API

Capabilities provide a declarative capability layer that Actions enforce and UI
components consume through hooks. The client runtime handles caching, diagnostics,
and cross-tab synchronisation.

## `defineCapability`

```ts
import { defineCapability } from '@wpkernel/core/capability';
```

### Signature

```ts
import type {
	CapabilityMap,
	CapabilityOptions,
	CapabilityHelpers,
} from '@wpkernel/core/capability';

declare function defineCapability<K extends Record<string, unknown>>(
	map: CapabilityMap<K>,
	options?: CapabilityOptions
): CapabilityHelpers<K>;
```

`defineCapability()` accepts a typed map of rules keyed by capability name. Each rule
receives a `CapabilityContext` with adapters, cache helpers, and the resolved
namespace. The return value contains helpers for evaluating and extending the
map.

### Options

`CapabilityOptions` customise runtime behaviour:

- `namespace` - override the detected plugin namespace. Defaults to
  `getNamespace()` (usually the package slug).
- `adapters.wp.canUser` - inject a capability check compatible with
  `@wordpress/data`’s `canUser` selector. The runtime auto-detects the core
  selector when the adapter is omitted.
- `adapters.restProbe` - async helper for pinging REST endpoints before a rule
  resolves. Optional.
- `cache.ttlMs` - default time-to-live per entry (60_000 ms by default).
- `cache.storage` - `'memory'` (default) or `'session'` persistence.
- `cache.crossTab` - enable/disable BroadcastChannel fan-out (defaults to `true`).
- `debug` - when `true`, the runtime logs reporter messages to the console.

### Usage

```ts
export type JobCapabilities = {
	'jobs.manage': void;
	'jobs.delete': { id: number };
};

export const capability = defineCapability<JobCapabilities>({
	'jobs.manage': () => true,
	'jobs.delete': async ({ adapters }, { id }) =>
		(await adapters.wp?.canUser('delete', {
			kind: 'postType',
			name: 'job',
			id,
		})) ?? false,
});
```

The returned helpers automatically register with the Action runtime so
`ctx.capability.can()` and `ctx.capability.assert()` operate on the same instance used by
`useCapability()`.

## `CapabilityHelpers`

`CapabilityHelpers<K>` exposes the following methods:

- `can(key, ...params)` → `boolean | Promise<boolean>` - Evaluate a rule without
  throwing. Async rules return promises.
- `assert(key, ...params)` → `void | Promise<void>` - Throws
  `WPKernelError('CapabilityDenied')` when the rule resolves to `false`. Also emits a
  `{namespace}.capability.denied` WordPress hook and BroadcastChannel event.
- `keys()` → `(keyof K)[]` - List registered capability keys.
- `extend(map)` → `void` - Merge additional rules and invalidate the cache for
  affected keys.
- `cache` - Shared `CapabilityCache` instance used by the runtime and UI hook.

## `CapabilityContext`

Rules receive a `CapabilityContext` argument with:

- `namespace` - resolved namespace.
- `adapters` - the adapters supplied through `CapabilityOptions` plus any detected
  defaults (`wp.canUser`, `restProbe`).
- `cache` - low-level cache interface supporting `get`, `set`, `invalidate`, and
  `subscribe`.
- `reporter` - structured logging hooks (`info`, `warn`, `error`, `debug`).

Use the context to compose decisions, log diagnostic events, or reuse cached
results across rules.

## `CapabilityCacheOptions`

```ts
interface CapabilityCacheOptions {
	ttlMs?: number;
	storage?: 'memory' | 'session';
	crossTab?: boolean;
}
```

- Entries expire after `ttlMs` unless overridden in `cache.set()`.
- `storage: 'session'` persists results to `sessionStorage`; memory is
  ephemeral.
- `crossTab: false` disables BroadcastChannel replication across tabs.

## `useCapability`

```ts
import { useCapability } from '@wpkernel/ui';
```

### Signature

```ts
function useCapability<K extends Record<string, unknown>>(): {
	can: <Key extends keyof K>(
		key: Key,
		...params: K[Key] extends void ? [] : [K[Key]]
	) => boolean;
	keys: (keyof K)[];
	isLoading: boolean;
	error?: Error;
};
```

### Behaviour

- Before hydration, `can()` returns `false` and `isLoading` is `true` so UI
  components can optimistically disable affordances.
- After hydration, the hook reads from the shared cache and subscribes to
  invalidation events for live updates.
- Thrown errors from `capability.can()` propagate to the hook’s `error` state.

### Usage

```tsx
import type { JobCapabilities } from '@/capability';

export function Toolbar({ id }: { id: number }) {
	const { can, isLoading } = useCapability<JobCapabilities>();
	const removeDisabled = isLoading || !can('jobs.delete', { id });

	return <Button disabled={removeDisabled}>Delete</Button>;
}
```

## Denial events

Every failed `assert()` emits a `{namespace}.capability.denied` hook via
`@wordpress/hooks` and a message on the `wpk.capability.events` BroadcastChannel. The
payload includes the capability key, sanitized params, message key, request id (when
available), and timestamp. Use these events to aggregate audit logs or fan out to
native bridges.
