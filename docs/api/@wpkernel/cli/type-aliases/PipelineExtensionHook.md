[**@wpkernel/cli v0.11.0**](../README.md)

---

[@wpkernel/cli](../README.md) / PipelineExtensionHook

# Type Alias: PipelineExtensionHook()

```ts
type PipelineExtensionHook = (options) => Promise<
  | PipelineExtensionHookResult
| void>;
```

Represents a pipeline extension hook function.

## Parameters

### options

[`PipelineExtensionHookOptions`](../interfaces/PipelineExtensionHookOptions.md)

## Returns

`Promise`\<
\| [`PipelineExtensionHookResult`](../interfaces/PipelineExtensionHookResult.md)
\| `void`\>
