[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / ResourceDataViewProps

# Interface: ResourceDataViewProps\&lt;TItem, TQuery\&gt;

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
optional resource: ResourceObject&lt;TItem, TQuery&gt;;
```

The resource object to display.

---

### config?

```ts
optional config: ResourceDataViewConfig&lt;TItem, TQuery&gt;;
```

The configuration for the DataView.

---

### controller?

```ts
optional controller: ResourceDataViewController&lt;TItem, TQuery&gt;;
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
optional fetchList: (query) => Promise&lt;ListResponse&lt;TItem&gt;&gt;;
```

An optional function to fetch a list of items, overriding the resource's fetchList.

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\&lt;`ListResponse`\&lt;`TItem`\&gt;\&gt;

---

### emptyState?

```ts
optional emptyState: ReactNode;
```

Content to display when the DataView is empty.
