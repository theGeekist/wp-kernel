[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / CacheKeyFn

# Type Alias: CacheKeyFn()\<TParams\>

```ts
type CacheKeyFn<TParams> = (
	params?
) => (string | number | boolean | null | undefined)[];
```

Defined in: [resource/types.ts:76](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L76)

Cache key generator function

Generates a unique key for caching resource data in the store.
Keys should be deterministic based on query parameters.

## Type Parameters

### TParams

`TParams` = `unknown`

## Parameters

### params?

`TParams`

Query parameters or identifier

## Returns

(`string` \| `number` \| `boolean` \| `null` \| `undefined`)[]

Array of cache key segments

## Example

```ts
(params) => ['thing', 'list', params?.q, params?.cursor]
(id) => ['thing', 'get', id]
```
