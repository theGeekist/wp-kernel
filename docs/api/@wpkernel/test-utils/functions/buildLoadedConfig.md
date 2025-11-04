[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / buildLoadedConfig

# Function: buildLoadedConfig()

```ts
function buildLoadedConfig&lt;TConfig, TOrigin, TComposerCheck&gt;(workspace, options): LoadedWPKConfigV1Like&lt;TConfig, TOrigin, TComposerCheck&gt;;
```

Builds a loaded kernel configuration object for testing.

## Type Parameters

### TConfig

`TConfig` _extends_ [`WPKConfigV1Like`](../interfaces/WPKConfigV1Like.md)\&lt;`Record`\&lt;`string`, `unknown`\&gt;, `Record`\&lt;`string`, `unknown`\&gt;, `unknown`\&gt; = [`WPKConfigV1Like`](../interfaces/WPKConfigV1Like.md)\&lt;`Record`\&lt;`string`, `unknown`\&gt;, `Record`\&lt;`string`, `unknown`\&gt;, `unknown`\&gt;

### TOrigin

`TOrigin` _extends_ `string` = `string`

### TComposerCheck

`TComposerCheck` _extends_ `string` = `string`

## Parameters

### workspace

`string`

The path to the workspace.

### options

[`BuildLoadedConfigOptions`](../interfaces/BuildLoadedConfigOptions.md)\&lt;`TConfig`, `TOrigin`, `TComposerCheck`\&gt; = `{}`

Options for configuring the loaded config.

## Returns

[`LoadedWPKConfigV1Like`](../interfaces/LoadedWPKConfigV1Like.md)\&lt;`TConfig`, `TOrigin`, `TComposerCheck`\&gt;

A `LoadedWPKConfigV1Like` object.
