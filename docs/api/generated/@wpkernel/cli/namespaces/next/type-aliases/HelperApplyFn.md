[**WP Kernel API v0.6.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [@wpkernel/cli](../../../README.md) / [next](../README.md) / HelperApplyFn

# Type Alias: HelperApplyFn()\&lt;TContext, TInput, TOutput\&gt;

```ts
type HelperApplyFn<TContext, TInput, TOutput> = (
	options,
	next?
) => Promise<void> | void;
```

## Type Parameters

### TContext

`TContext`

### TInput

`TInput`

### TOutput

`TOutput`

## Parameters

### options

[`HelperApplyOptions`](../interfaces/HelperApplyOptions.md)\&lt;`TContext`, `TInput`, `TOutput`\&gt;

### next?

() =&gt; `Promise`\&lt;`void`\&gt;

## Returns

`Promise`\&lt;`void`\&gt; \| `void`
