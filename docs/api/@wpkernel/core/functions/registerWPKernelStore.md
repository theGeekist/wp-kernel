[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / registerWPKernelStore

# Function: registerWPKernelStore()

```ts
function registerWPKernelStore&lt;Key, State, Actions, Selectors&gt;(key, config): StoreDescriptor&lt;ReduxStoreConfig&lt;State, Actions, Selectors&gt;&gt;;
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
