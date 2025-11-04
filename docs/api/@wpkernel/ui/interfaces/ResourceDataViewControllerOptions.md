[**WP Kernel API v0.11.0**](../README.md)

---

[WP Kernel API](../README.md) / ResourceDataViewControllerOptions

# Interface: ResourceDataViewControllerOptions\&lt;TItem, TQuery\&gt;

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
optional resource: ResourceObject&lt;TItem, TQuery&gt;;
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
optional queryMapping: QueryMapping&lt;TQuery&gt;;
```

A function to map the view state to a query.

---

### invalidate()?

```ts
optional invalidate: (patterns) =&gt; void;
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
optional fetchList: (query) =&gt; Promise&lt;ListResponse&lt;TItem&gt;&gt;;
```

A function to fetch a list of items.

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\&lt;`ListResponse`\&lt;`TItem`\&gt;\&gt;

---

### prefetchList()?

```ts
optional prefetchList: (query) =&gt; Promise&lt;void&gt;;
```

A function to prefetch a list of items.

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\&lt;`void`\&gt;
