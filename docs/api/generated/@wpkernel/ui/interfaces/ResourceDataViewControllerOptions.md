[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / ResourceDataViewControllerOptions

# Interface: ResourceDataViewControllerOptions\&lt;TItem, TQuery\&gt;

## Type Parameters

### TItem

`TItem`

### TQuery

`TQuery`

## Properties

### resource?

```ts
optional resource: ResourceObject<TItem, TQuery>;
```

---

### resourceName?

```ts
optional resourceName: string;
```

---

### config

```ts
config: ResourceDataViewConfig<TItem, TQuery>;
```

---

### queryMapping?

```ts
optional queryMapping: QueryMapping<TQuery>;
```

---

### runtime

```ts
runtime: DataViewsControllerRuntime;
```

---

### namespace

```ts
namespace: string;
```

---

### invalidate()?

```ts
optional invalidate: (patterns) => void;
```

#### Parameters

##### patterns

[`CacheKeyPattern`](../../../core/src/type-aliases/CacheKeyPattern.md) | [`CacheKeyPattern`](../../../core/src/type-aliases/CacheKeyPattern.md)[]

#### Returns

`void`

---

### policies?

```ts
optional policies: KernelUIPolicyRuntimeSource;
```

---

### preferencesKey?

```ts
optional preferencesKey: string;
```

---

### fetchList()?

```ts
optional fetchList: (query) => Promise<ListResponse<TItem>>;
```

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\&lt;[`ListResponse`](../../../core/src/type-aliases/ListResponse.md)\&lt;`TItem`\&gt;\&gt;

---

### prefetchList()?

```ts
optional prefetchList: (query) => Promise<void>;
```

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\&lt;`void`\&gt;
