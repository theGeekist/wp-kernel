[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / ResourceDataViewControllerOptions

# Interface: ResourceDataViewControllerOptions\&lt;TItem, TQuery\&gt;

## Type Parameters

### TItem

`TItem`

### TQuery

`TQuery`

## Properties

### capabilities?

```ts
optional capabilities: WPKUICapabilityRuntimeSource;
```

---

### config

```ts
config: ResourceDataViewConfig<TItem, TQuery>;
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

### namespace

```ts
namespace: string;
```

---

### preferencesKey?

```ts
optional preferencesKey: string;
```

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

---

### queryMapping?

```ts
optional queryMapping: QueryMapping<TQuery>;
```

---

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

### runtime

```ts
runtime: DataViewsControllerRuntime;
```
