[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / HelperApplyFn

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

`TReporter` _extends_ [`Reporter`](../../../core/src/type-aliases/Reporter.md) = [`Reporter`](../../../core/src/type-aliases/Reporter.md)

## Parameters

### options

[`HelperApplyOptions`](../interfaces/HelperApplyOptions.md)\&lt;`TContext`, `TInput`, `TOutput`, `TReporter`\&gt;

### next?

() =&gt; `MaybePromise`\&lt;`void`\&gt;

## Returns

`MaybePromise`\&lt;`void`\&gt;
