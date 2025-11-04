[**WP Kernel API v0.11.0**](../../../../README.md)

***

[WP Kernel API](../../../../README.md) / [pipeline](../README.md) / PipelineExtensionHook

# Type Alias: PipelineExtensionHook()\&lt;TContext, TOptions, TArtifact\&gt;

```ts
type PipelineExtensionHook&lt;TContext, TOptions, TArtifact&gt; = (options) =&gt; MaybePromise&lt;
  | PipelineExtensionHookResult&lt;TArtifact&gt;
| void&gt;;
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

[`MaybePromise`](MaybePromise.md)\&lt;
  \| [`PipelineExtensionHookResult`](../interfaces/PipelineExtensionHookResult.md)\&lt;`TArtifact`\&gt;
  \| `void`\&gt;
