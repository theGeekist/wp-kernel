[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / KernelRegistry

# Type Alias: KernelRegistry

```ts
type KernelRegistry = WPDataRegistry & object;
```

## Type Declaration

### \_\_experimentalUseMiddleware()?

```ts
optional __experimentalUseMiddleware: (middleware) => () => void | void;
```

#### Parameters

##### middleware

() =&gt; `ReduxMiddleware`[]

#### Returns

() =&gt; `void` \| `void`

### dispatch()

```ts
dispatch: (storeName) => unknown;
```

#### Parameters

##### storeName

`string`

#### Returns

`unknown`
