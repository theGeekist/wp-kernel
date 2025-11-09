[**@wpkernel/test-utils v0.12.1-beta.2**](../README.md)

---

[@wpkernel/test-utils](../README.md) / buildLoadedConfig

# Function: buildLoadedConfig()

```ts
function buildLoadedConfig<TConfig, TOrigin, TComposerCheck>(
	workspace,
	options
): LoadedWPKConfigV1Like<TConfig, TOrigin, TComposerCheck>;
```

Builds a loaded wpk configuration object for testing.

## Type Parameters

### TConfig

`TConfig` _extends_ [`WPKConfigV1Like`](../interfaces/WPKConfigV1Like.md)\<[`SchemaRegistryLike`](../interfaces/SchemaRegistryLike.md), [`ResourceRegistryLike`](../interfaces/ResourceRegistryLike.md), `unknown`\> = [`WPKConfigV1Like`](../interfaces/WPKConfigV1Like.md)\<[`SchemaRegistryLike`](../interfaces/SchemaRegistryLike.md), [`ResourceRegistryLike`](../interfaces/ResourceRegistryLike.md), `unknown`\>

### TOrigin

`TOrigin` _extends_ `string` = `string`

### TComposerCheck

`TComposerCheck` _extends_ `string` = `string`

## Parameters

### workspace

`string`

The path to the workspace.

### options

[`BuildLoadedConfigOptions`](../interfaces/BuildLoadedConfigOptions.md)\<`TConfig`, `TOrigin`, `TComposerCheck`\> = `{}`

Options for configuring the loaded config.

## Returns

[`LoadedWPKConfigV1Like`](../interfaces/LoadedWPKConfigV1Like.md)\<`TConfig`, `TOrigin`, `TComposerCheck`\>

A `LoadedWPKConfigV1Like` object.
