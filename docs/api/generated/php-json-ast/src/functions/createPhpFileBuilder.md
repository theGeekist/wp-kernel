[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [php-json-ast/src](../README.md) / createPhpFileBuilder

# Function: createPhpFileBuilder()

```ts
function createPhpFileBuilder<TContext, TInput, TOutput>(
	options
): BuilderHelper<TContext, TInput, TOutput>;
```

## Type Parameters

### TContext

`TContext` _extends_ [`PipelineContext`](../interfaces/PipelineContext.md) = [`PipelineContext`](../interfaces/PipelineContext.md)

### TInput

`TInput` _extends_ [`BuilderInput`](../interfaces/BuilderInput.md) = [`BuilderInput`](../interfaces/BuilderInput.md)

### TOutput

`TOutput` _extends_ [`BuilderOutput`](../interfaces/BuilderOutput.md) = [`BuilderOutput`](../interfaces/BuilderOutput.md)

## Parameters

### options

[`CreatePhpFileBuilderOptions`](../interfaces/CreatePhpFileBuilderOptions.md)\&lt;`TContext`, `TInput`, `TOutput`\&gt;

## Returns

[`BuilderHelper`](../type-aliases/BuilderHelper.md)\&lt;`TContext`, `TInput`, `TOutput`\&gt;
