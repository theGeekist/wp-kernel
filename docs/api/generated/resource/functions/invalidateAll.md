[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / invalidateAll

# Function: invalidateAll()

```ts
function invalidateAll(storeKey): void;
```

Defined in: [resource/cache.ts:464](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/cache.ts#L464)

Invalidate all caches in a specific store

## Parameters

### storeKey

`string`

The store key to invalidate (e.g., 'wpk/thing')

## Returns

`void`

## Example

```ts
// Clear all cached data for 'thing' resource
invalidateAll('wpk/thing');
```
