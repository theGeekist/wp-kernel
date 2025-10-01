[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / defineResource

# Function: defineResource()

```ts
function defineResource<T, TQuery>(config): ResourceObject<T, TQuery>;
```

Defined in: [resource/define.ts:69](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/define.ts#L69)

Define a resource with typed REST client

Creates a resource object with:

- Typed client methods (fetchList, fetch, create, update, remove)
- Store key for @wordpress/data registration
- Cache key generators for invalidation
- Route definitions
- Thin-flat API (useGet, useList, prefetchGet, prefetchList, invalidate, key)
- Grouped API (select._, use._, get._, mutate._, cache._, storeApi._, events.\*)

## Type Parameters

### T

`T` = `unknown`

Resource entity type (e.g., TestimonialPost)

### TQuery

`TQuery` = `unknown`

Query parameters type for list operations (e.g., { search?: string })

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
const testimonial = defineResource<TestimonialPost, { search?: string }>({
	name: 'testimonial',
	routes: {
		list: { path: '/wpk/v1/testimonials', method: 'GET' },
		get: { path: '/wpk/v1/testimonials/:id', method: 'GET' },
		create: { path: '/wpk/v1/testimonials', method: 'POST' },
	},
	cacheKeys: {
		list: (q) => ['testimonial', 'list', q?.search],
		get: (id) => ['testimonial', 'get', id],
	},
});

// Thin-flat API
const { items } = await testimonial.fetchList({ search: 'excellent' });
const item = await testimonial.fetch(123);
testimonial.invalidate([['testimonial', 'list']]);

// Grouped API
const cached = testimonial.select.item(123);
await testimonial.get.item(123); // Always fresh from server
await testimonial.mutate.create({ title: 'Amazing!' });
testimonial.cache.invalidate.all();
```
