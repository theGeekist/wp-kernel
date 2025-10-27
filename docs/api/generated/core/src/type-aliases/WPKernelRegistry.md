[**WP Kernel API v0.8.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / WPKernelRegistry

# Type Alias: WPKernelRegistry

```ts
type WPKernelRegistry = WPDataRegistry & object;
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
