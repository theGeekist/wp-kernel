[**@wpkernel/test-utils v0.12.2-beta.0**](../README.md)

---

[@wpkernel/test-utils](../README.md) / buildLoadedConfig

# Function: buildLoadedConfig()

```ts
function buildLoadedConfig<TConfig, TOrigin>(
	workspace,
	options
): LoadedWPKConfigV1Like<TConfig, TOrigin>;
```

Builds a loaded wpk configuration object for testing.

## Type Parameters

### TConfig

`TConfig` _extends_ [`WPKConfigV1Like`](../interfaces/WPKConfigV1Like.md)\<[`SchemaRegistryLike`](../interfaces/SchemaRegistryLike.md), [`ResourceRegistryLike`](../interfaces/ResourceRegistryLike.md), `unknown`\> = [`WPKConfigV1Like`](../interfaces/WPKConfigV1Like.md)\<[`SchemaRegistryLike`](../interfaces/SchemaRegistryLike.md), [`ResourceRegistryLike`](../interfaces/ResourceRegistryLike.md), `unknown`\>

### TOrigin

`TOrigin` _extends_ `string` = `string`

## Parameters

### workspace

`string`

The path to the workspace.

### options

[`BuildLoadedConfigOptions`](../interfaces/BuildLoadedConfigOptions.md)\<`TConfig`, `TOrigin`\> = `{}`

Options for configuring the loaded config.

## Returns

[`LoadedWPKConfigV1Like`](../interfaces/LoadedWPKConfigV1Like.md)\<`TConfig`, `TOrigin`\>

A `LoadedWPKConfigV1Like` object.
