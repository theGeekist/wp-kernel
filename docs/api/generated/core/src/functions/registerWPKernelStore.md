[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / registerWPKernelStore

# Function: registerWPKernelStore()

```ts
function registerWPKernelStore<Key, State, Actions, Selectors>(
	key,
	config
): StoreDescriptor<ReduxStoreConfig<State, Actions, Selectors>>;
```

Register a WordPress data store using WP Kernel defaults.

The helper wraps `@wordpress/data` store registration so packages can rely on
consistent middleware ordering and return the created store for further wiring.

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

Store key used for registration

### config

`ReduxStoreConfig`\&lt;`State`, `Actions`, `Selectors`\&gt;

Store configuration passed to `createReduxStore`

## Returns

`StoreDescriptor`\&lt;`ReduxStoreConfig`\&lt;`State`, `Actions`, `Selectors`\&gt;\&gt;

Registered WordPress data store
