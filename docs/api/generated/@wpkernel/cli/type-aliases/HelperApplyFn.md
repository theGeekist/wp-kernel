[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/cli](../README.md) / HelperApplyFn

# Type Alias: HelperApplyFn()\&lt;TContext, TInput, TOutput, TReporter\&gt;

```ts
type HelperApplyFn<TContext, TInput, TOutput, TReporter> = (
	options,
	next?
) => MaybePromise<void>;
```

## Type Parameters

### TContext

`TContext`

### TInput

`TInput`

### TOutput

`TOutput`

### TReporter

`TReporter` _extends_ `PipelineReporter` = `PipelineReporter`

## Parameters

### options

[`HelperApplyOptions`](../interfaces/HelperApplyOptions.md)\&lt;`TContext`, `TInput`, `TOutput`, `TReporter`\&gt;

### next?

() =&gt; `MaybePromise`\&lt;`void`\&gt;

## Returns

`MaybePromise`\&lt;`void`\&gt;
