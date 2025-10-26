[**WP Kernel API v0.4.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / registerKernelStore

# Function: registerKernelStore()

```ts
function registerKernelStore<Key, State, Actions, Selectors>(
	key,
	config
): StoreDescriptor<ReduxStoreConfig<State, Actions, Selectors>>;
```

## Type Parameters

### Key

`Key` _extends_ `string`

### State

`State`

### Actions

`Actions` _extends_ `Record`\&lt;`string`, (...`args`) =&gt; `unknown`\&gt;

### Selectors

`Selectors`

## Parameters

### key

`Key`

### config

`ReduxStoreConfig`\&lt;`State`, `Actions`, `Selectors`\&gt;

## Returns

`StoreDescriptor`\&lt;`ReduxStoreConfig`\&lt;`State`, `Actions`, `Selectors`\&gt;\&gt;
