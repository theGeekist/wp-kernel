[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / usePrefetcher

# Function: usePrefetcher()

```ts
function usePrefetcher&lt;TRecord, TQuery&gt;(resource): Prefetcher&lt;TQuery&gt;;
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

`ResourceObject`\&lt;`TRecord`, `TQuery`\&gt;

## Returns

[`Prefetcher`](../interfaces/Prefetcher.md)\&lt;`TQuery`\&gt;
