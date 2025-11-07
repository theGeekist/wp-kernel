[**@wpkernel/ui v0.12.0**](../README.md)

---

[@wpkernel/ui](../README.md) / ResourceDataViewControllerOptions

# Interface: ResourceDataViewControllerOptions\<TItem, TQuery\>

Options for creating a `ResourceDataViewController`.

## Type Parameters

### TItem

`TItem`

### TQuery

`TQuery`

## Properties

### config

```ts
config: ResourceDataViewConfig & lt;
(TItem, TQuery & gt);
```

The configuration for the DataView.

---

### runtime

```ts
runtime: DataViewsControllerRuntime;
```

The runtime for the DataView controller.

---

### namespace

```ts
namespace: string;
```

The namespace of the project.

---

### resource?

```ts
optional resource: ResourceObject<TItem, TQuery>;
```

The resource object.

---

### resourceName?

```ts
optional resourceName: string;
```

The name of the resource.

---

### queryMapping?

```ts
optional queryMapping: QueryMapping<TQuery>;
```

A function to map the view state to a query.

---

### invalidate()?

```ts
optional invalidate: (patterns) => void;
```

A function to invalidate cache entries.

#### Parameters

##### patterns

`CacheKeyPattern` | `CacheKeyPattern`[]

#### Returns

`void`

---

### capabilities?

```ts
optional capabilities: WPKUICapabilityRuntimeSource;
```

The capability runtime source.

---

### preferencesKey?

```ts
optional preferencesKey: string;
```

The key for storing preferences.

---

### fetchList()?

```ts
optional fetchList: (query) => Promise<ListResponse<TItem>>;
```

A function to fetch a list of items.

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\<`ListResponse`\<`TItem`\>\>

---

### prefetchList()?

```ts
optional prefetchList: (query) => Promise<void>;
```

A function to prefetch a list of items.

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\<`void`\>
