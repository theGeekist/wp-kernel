[**@wpkernel/ui v0.12.0**](../README.md)

---

[@wpkernel/ui](../README.md) / ResourceDataViewProps

# Interface: ResourceDataViewProps\<TItem, TQuery\>

Props for the ResourceDataView component.

## Type Parameters

### TItem

`TItem`

The type of the items in the resource list.

### TQuery

`TQuery`

The type of the query parameters for the resource.

## Properties

### resource?

```ts
optional resource: ResourceObject<TItem, TQuery>;
```

The resource object to display.

---

### config?

```ts
optional config: ResourceDataViewConfig<TItem, TQuery>;
```

The configuration for the DataView.

---

### controller?

```ts
optional controller: ResourceDataViewController<TItem, TQuery>;
```

An optional pre-configured controller for the DataView.

---

### runtime?

```ts
optional runtime:
  | WPKernelUIRuntime
  | DataViewsRuntimeContext;
```

The runtime context for the DataView.

---

### fetchList()?

```ts
optional fetchList: (query) => Promise<ListResponse<TItem>>;
```

An optional function to fetch a list of items, overriding the resource's fetchList.

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\<`ListResponse`\<`TItem`\>\>

---

### emptyState?

```ts
optional emptyState: ReactNode;
```

Content to display when the DataView is empty.
