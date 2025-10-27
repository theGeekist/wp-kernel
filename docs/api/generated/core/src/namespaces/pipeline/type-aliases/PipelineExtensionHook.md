[**WP Kernel API v0.7.0**](../../../../../README.md)

---

[WP Kernel API](../../../../../README.md) / [core/src](../../../README.md) / [pipeline](../README.md) / PipelineExtensionHook

# Type Alias: PipelineExtensionHook()\&lt;TContext, TOptions, TArtifact\&gt;

```ts
type PipelineExtensionHook<TContext, TOptions, TArtifact> = (
	options
) => Promise<PipelineExtensionHookResult<TArtifact> | void>;
```

## Type Parameters

### TContext

`TContext`

### TOptions

`TOptions`

### TArtifact

`TArtifact`

## Parameters

### options

[`PipelineExtensionHookOptions`](../interfaces/PipelineExtensionHookOptions.md)\&lt;`TContext`, `TOptions`, `TArtifact`\&gt;

## Returns

`Promise`\&lt;
\| [`PipelineExtensionHookResult`](../interfaces/PipelineExtensionHookResult.md)\&lt;`TArtifact`\&gt;
\| `void`\&gt;
