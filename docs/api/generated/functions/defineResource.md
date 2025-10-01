[**WP Kernel API v0.1.1**](../README.md)

---

[WP Kernel API](../README.md) / defineResource

# Function: defineResource()

```ts
function defineResource<T, TQuery>(config): ResourceObject<T, TQuery>;
```

Defined in: [defineResource.ts:339](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/defineResource.ts#L339)

Define a resource with typed REST client

Creates a resource object with:

- Typed client methods (list, get, create, update, remove)
- Store key for @wordpress/data registration
- Cache key generators for invalidation
- Route definitions

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

// Use client methods
const items = await thing.list({ q: 'search' });
const item = await thing.get(123);

// Use metadata
console.log(thing.storeKey); // 'wpk/thing'
invalidate(thing.cacheKeys.list({ q: 'search' }));
```
