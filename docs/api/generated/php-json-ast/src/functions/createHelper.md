[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / createHelper

# Function: createHelper()

```ts
function createHelper<TContext, TInput, TOutput, TReporter, TKind>(
	options
): Helper<TContext, TInput, TOutput, TReporter, TKind>;
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

### TKind

`TKind` _extends_ [`HelperKind`](../type-aliases/HelperKind.md) = [`HelperKind`](../type-aliases/HelperKind.md)

## Parameters

### options

[`CreateHelperOptions`](../interfaces/CreateHelperOptions.md)\&lt;`TContext`, `TInput`, `TOutput`, `TReporter`, `TKind`\&gt;

## Returns

[`Helper`](../interfaces/Helper.md)\&lt;`TContext`, `TInput`, `TOutput`, `TReporter`, `TKind`\&gt;
