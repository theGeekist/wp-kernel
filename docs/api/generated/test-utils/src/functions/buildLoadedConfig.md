[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [test-utils/src](../README.md) / buildLoadedConfig

# Function: buildLoadedConfig()

```ts
function buildLoadedConfig<TConfig, TOrigin, TComposerCheck>(
	workspace,
	options
): LoadedKernelConfigLike<TConfig, TOrigin, TComposerCheck>;
```

## Type Parameters

### TConfig

`TConfig` _extends_ `KernelConfigV1Like`\&lt;`Record`\&lt;`string`, `unknown`\&gt;, `Record`\&lt;`string`, `unknown`\&gt;, `unknown`\&gt; = `KernelConfigV1Like`\&lt;`Record`\&lt;`string`, `unknown`\&gt;, `Record`\&lt;`string`, `unknown`\&gt;, `unknown`\&gt;

### TOrigin

`TOrigin` _extends_ `string` = `string`

### TComposerCheck

`TComposerCheck` _extends_ `string` = `string`

## Parameters

### workspace

`string`

### options

[`BuildLoadedConfigOptions`](../interfaces/BuildLoadedConfigOptions.md)\&lt;`TConfig`, `TOrigin`, `TComposerCheck`\&gt; = `{}`

## Returns

`LoadedKernelConfigLike`\&lt;`TConfig`, `TOrigin`, `TComposerCheck`\&gt;
