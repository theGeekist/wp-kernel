[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / useNextPagePrefetch

# Function: useNextPagePrefetch()

```ts
function useNextPagePrefetch&lt;TRecord, TQuery&gt;(
   resource,
   currentQuery,
   options): void;
```

Prefetches the next page of a paginated resource.

## Type Parameters

### TRecord

`TRecord`

### TQuery

`TQuery` _extends_ `Record`\&lt;`string`, `unknown`\&gt;

## Parameters

### resource

`ResourceObject`\&lt;`TRecord`, `TQuery`\&gt;

The resource to prefetch.

### currentQuery

`TQuery`

The current query.

### options

[`NextPagePrefetchOptions`](../interfaces/NextPagePrefetchOptions.md)\&lt;`TQuery`\&gt; = `{}`

Options for the hook.

## Returns

`void`
