[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / PipelineExtensionHook

# Type Alias: PipelineExtensionHook()

```ts
type PipelineExtensionHook = (options) =&gt; Promise&lt;
  | PipelineExtensionHookResult
| void&gt;;
```

Represents a pipeline extension hook function.

## Parameters

### options

[`PipelineExtensionHookOptions`](../interfaces/PipelineExtensionHookOptions.md)

## Returns

`Promise`\&lt;
\| [`PipelineExtensionHookResult`](../interfaces/PipelineExtensionHookResult.md)
\| `void`\&gt;
