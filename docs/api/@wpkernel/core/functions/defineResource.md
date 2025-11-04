[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / defineResource

# Function: defineResource()

```ts
function defineResource&lt;T, TQuery&gt;(config): ResourceObject&lt;T, TQuery&gt;;
```

Define a resource with typed REST client

Creates a resource object with:
- Typed client methods (fetchList, fetch, create, update, remove)
- Store key for @wordpress/data registration
- Cache key generators for invalidation
- Route definitions
- Thin-flat API (useGet, useList, prefetchGet, prefetchList, invalidate, key)
- Grouped API (select.*, use.*, get.*, mutate.*, cache.*, storeApi.*, events.*)

## Type Parameters

### T

`T` = `unknown`

Resource entity type (e.g., TestimonialPost)

### TQuery

`TQuery` = `unknown`

Query parameters type for list operations (e.g., { search?: string })

## Parameters

### config

[`ResourceConfig`](../type-aliases/ResourceConfig.md)\&lt;`T`, `TQuery`\&gt;

Resource configuration

## Returns

[`ResourceObject`](../type-aliases/ResourceObject.md)\&lt;`T`, `TQuery`\&gt;

Resource object with client methods and metadata

## Throws

DeveloperError if configuration is invalid
