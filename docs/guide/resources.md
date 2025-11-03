# Resources

Resources describe how your plugin talks to WordPress. A single call to `defineResource` gives you REST clients, grouped APIs, cache helpers, store selectors, React hooks, and canonical events that share the same namespace.【F:packages/core/src/resource/define.ts†L115-L390】

## Anatomy of a resource

```ts
import { defineResource } from '@wpkernel/core/resource';

interface Job {
	id: number;
	title: string;
	status: 'draft' | 'open' | 'closed';
}

type JobQuery = { status?: Job['status']; search?: string };

export const job = defineResource<Job, JobQuery>({
	name: 'job',
	routes: {
		list: { path: '/acme/v1/jobs', method: 'GET' },
		get: { path: '/acme/v1/jobs/:id', method: 'GET' },
		create: { path: '/acme/v1/jobs', method: 'POST' },
	},
	schema: 'auto',
	identity: { type: 'number', param: 'id' },
	cacheKeys: {
		list: (query) => [
			'job',
			'list',
			query?.status ?? null,
			query?.search ?? null,
		],
		get: (id) => ['job', 'get', id],
	},
	capabilityHints: {
		create: 'jobs.create',
	},
});
```

The resource above gives you:

- **REST client methods** - `job.fetchList(query)`, `job.fetch(id)`, `job.create(data)`, `job.update(id, data)`, and `job.remove(id)` when the corresponding routes exist.【F:packages/core/src/resource/client.ts†L41-L230】
- **React hooks** - `job.useList(query)` and `job.useGet(id)` become available after you call `attachUIBindings(kernel)` in your UI bundle.【F:packages/ui/src/hooks/resource-hooks.ts†L1-L160】【F:packages/ui/src/runtime/attachUIBindings.ts†L1-L120】
- **Grouped APIs** - selectors under `job.select.*`, cache helpers under `job.cache.*`, and fetch methods under `job.get.*` and `job.fetch*` for advanced orchestration.【F:packages/core/src/resource/grouped-api.ts†L1-L170】
- **Events** - `job.events.created`, `job.events.updated`, and `job.events.removed` emit through the kernel event bus with your namespace baked in.【F:packages/core/src/resource/define.ts†L390-L430】
- **Cache helpers** - `job.cache.key('list')`, `job.prefetchList(query)`, and `job.prefetchGet(id)` wrap the WordPress data store’s selectors and resolvers.【F:packages/core/src/resource/types.ts†L459-L620】

## Namespaces

If you omit `namespace`, the runtime detects it from your plugin headers. You can override it per resource, or use shorthand `namespace:name` syntax when you want the resource to live under a different prefix. The namespace shapes store keys (`{namespace}/{resource}`) and domain events (`{namespace}.{resource}.created`).【F:packages/core/src/resource/define.ts†L151-L210】

## Schemas keep clients honest

Passing `'auto'` tells the CLI to derive JSON Schema from your TypeScript types. Alternatively you can import a schema file via the config. Either way the schema feeds `json-schema-to-typescript` for `.d.ts` generation and the PHP builder for REST argument metadata.【F:packages/cli/src/builders/ts.ts†L1-L200】【F:packages/cli/src/builders/php/resourceController.ts†L1-L220】

## Cache and invalidation

Every route can define a cache key helper. Actions typically call `ctx.invalidate([job.cache.key('list')])` or one of the grouped helpers (`job.cache.invalidate.list(query)`) after mutations. The resource runtime records keys and uses `@wordpress/data` resolvers to keep list and item caches consistent.【F:packages/core/src/resource/cache.ts†L1-L760】【F:packages/core/src/resource/store.ts†L430-L560】

## Capabilities and capability checks

`capabilityHints` bridge frontend intent with backend enforcement. When you provide a hint for a write route, the PHP builder wires `permission_callback` to `Capability::enforce('jobs.create', $request)`. Missing hints trigger a warning and fall back to `current_user_can('manage_options')`, which is surfaced in the generation summary.【F:packages/cli/src/builders/php/routes.ts†L170-L260】【F:packages/cli/src/builders/php/resourceController.ts†L1-L120】

## Using resources from the UI

```tsx
import { job } from '@/resources/job';

export function JobList() {
	const { data, isLoading, error } = job.useList({ status: 'open' });

	if (isLoading) return <p>Loading…</p>;
	if (error) return <p role="alert">{error}</p>;

	return (
		<ul>
			{data?.items.map((item) => (
				<li key={item.id}>{item.title}</li>
			))}
		</ul>
	);
}
```

Hooks draw from the same store keys as the grouped selectors. They throw a `WPKernelError` if `@wordpress/data` is not present, which protects you during SSR or early bootstrap.【F:packages/ui/src/hooks/resource-hooks.ts†L40-L140】

## Surfacing data in admin screens

When your kernel config includes `ui.admin.dataviews`, the CLI emits `.generated/ui/app/<resource>/admin/<Component>.tsx` and DataViews fixtures. The generated screen uses the resource’s `job.useList()` hook and automatically registers a controller with the UI runtime, so rendering `<ResourceDataView>` is enough to display the list.【F:packages/cli/src/builders/ts.ts†L1-L200】【F:packages/ui/src/dataviews/resource-controller.ts†L1-L180】

## Where to go next

- Read the [Decision Matrix](/reference/decision-matrix) to see which printers react to specific resource options.
- Browse the [Showcase kernel config](/examples/showcase) for a production-scale example.
- Explore the generated Typedoc under [`/api/core/`](../api/) to inspect every helper exposed by the resource runtime.
