[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / WPKernelRegistry

# Type Alias: WPKernelRegistry

```ts
type WPKernelRegistry = WPDataRegistry & object;
```

## Type Declaration

### dispatch()

```ts
dispatch: (storeName) =&gt; unknown;
```

#### Parameters

##### storeName

`string`

#### Returns

`unknown`

### \_\_experimentalUseMiddleware()?

```ts
optional __experimentalUseMiddleware: (middleware) =&gt; () =&gt; void | void;
```

#### Parameters

##### middleware

() =&gt; [`ReduxMiddleware`](../WP-Kernel-API/namespaces/actions/type-aliases/ReduxMiddleware.md)[]

#### Returns

() =&gt; `void` \| `void`
