[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / ResourceDataViewProps

# Interface: ResourceDataViewProps\&lt;TItem, TQuery\&gt;

## Type Parameters

### TItem

`TItem`

### TQuery

`TQuery`

## Properties

### config?

```ts
optional config: ResourceDataViewConfig<TItem, TQuery>;
```

---

### controller?

```ts
optional controller: ResourceDataViewController<TItem, TQuery>;
```

---

### emptyState?

```ts
optional emptyState: ReactNode;
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

### resource?

```ts
optional resource: ResourceObject<TItem, TQuery>;
```

---

### runtime?

```ts
optional runtime:
  | WPKernelUIRuntime
  | DataViewsRuntimeContext;
```
