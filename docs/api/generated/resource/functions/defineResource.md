[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / defineResource

# Function: defineResource()

```ts
function defineResource<T, TQuery>(config): ResourceObject<T, TQuery>;
```

Defined in: [resource/define.ts:68](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/define.ts#L68)

Define a resource with typed REST client

Creates a resource object with:

- Typed client methods (list, get, create, update, remove)
- Store key for @wordpress/data registration
- Cache key generators for invalidation
- Route definitions
- Thin-flat API (useGet, useList, prefetchGet, prefetchList, invalidate, key)
- Grouped API (select._, use._, fetch._, mutate._, cache._, storeApi._, events.\*)

## Type Parameters

### T

`T` = `unknown`

Resource entity type (e.g., Thing)

### TQuery

`TQuery` = `unknown`

Query parameters type for list operations (e.g., { q?: string })

## Parameters

### config

[`ResourceConfig`](../interfaces/ResourceConfig.md)\<`T`, `TQuery`\>

Resource configuration

## Returns

[`ResourceObject`](../interfaces/ResourceObject.md)\<`T`, `TQuery`\>

Resource object with client methods and metadata

## Throws

DeveloperError if configuration is invalid

## Example

```ts
const thing = defineResource<Thing, { q?: string }>({
	name: 'thing',
	routes: {
		list: { path: '/wpk/v1/things', method: 'GET' },
		get: { path: '/wpk/v1/things/:id', method: 'GET' },
		create: { path: '/wpk/v1/things', method: 'POST' },
	},
	cacheKeys: {
		list: (q) => ['thing', 'list', q?.q],
		get: (id) => ['thing', 'get', id],
	},
});

// Thin-flat API
const items = await thing.list({ q: 'search' });
const item = await thing.get(123);
thing.invalidate([['thing', 'list']]);

// Grouped API
const cached = thing.select.item(123);
await thing.mutate.create({ title: 'New' });
thing.cache.invalidate.all();
```
