[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / useNextPagePrefetch

# Function: useNextPagePrefetch()

```ts
function useNextPagePrefetch<TRecord, TQuery>(
	resource,
	currentQuery,
	options
): void;
```

## Type Parameters

### TRecord

`TRecord`

### TQuery

`TQuery` _extends_ `Record`\&lt;`string`, `unknown`\&gt;

## Parameters

### resource

[`ResourceObject`](../../../core/src/type-aliases/ResourceObject.md)\&lt;`TRecord`, `TQuery`\&gt;

### currentQuery

`TQuery`

### options

`NextPagePrefetchOptions`\&lt;`TQuery`\&gt; = `{}`

## Returns

`void`
