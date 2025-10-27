[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / usePrefetcher

# Function: usePrefetcher()

```ts
function usePrefetcher<TRecord, TQuery>(resource): Prefetcher<TQuery>;
```

Exposes stable cache prefetch helpers for a resource.

Wraps the kernel resource's `prefetchGet` and `prefetchList` helpers so React
components can wire them to UI affordances (hover, visibility, etc.) without
re-creating callback instances on every render.

## Type Parameters

### TRecord

`TRecord`

### TQuery

`TQuery` = `unknown`

## Parameters

### resource

[`ResourceObject`](../../../core/src/type-aliases/ResourceObject.md)\&lt;`TRecord`, `TQuery`\&gt;

## Returns

`Prefetcher`\&lt;`TQuery`\&gt;
