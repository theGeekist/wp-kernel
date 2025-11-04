[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / CacheKeyPattern

# Type Alias: CacheKeyPattern

```ts
type CacheKeyPattern = (string | number | boolean | null | undefined)[];
```

Cache key pattern - array of primitives (strings, numbers, booleans)
Null and undefined values are filtered out during normalization.

## Example

```ts
['thing', 'list']                    // Matches all 'thing' lists
['thing', 'list', 'active']          // Matches lists filtered by 'active'
['thing', 'get', 123]                // Matches get query for item 123
```
