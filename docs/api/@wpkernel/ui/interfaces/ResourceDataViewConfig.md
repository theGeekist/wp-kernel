[**@wpkernel/ui v0.12.0**](../README.md)

---

[@wpkernel/ui](../README.md) / ResourceDataViewConfig

# Interface: ResourceDataViewConfig\<TItem, TQuery\>

Resource DataView configuration.

## Type Parameters

### TItem

`TItem`

### TQuery

`TQuery`

## Properties

### fields

```ts
fields: Field & lt;
TItem & gt;
[];
```

---

### defaultView

```ts
defaultView: View;
```

---

### mapQuery

```ts
mapQuery: QueryMapping & lt;
TQuery & gt;
```

---

### actions?

```ts
optional actions: ResourceDataViewActionConfig<TItem, unknown, unknown>[];
```

---

### search?

```ts
optional search: boolean;
```

---

### searchLabel?

```ts
optional searchLabel: string;
```

---

### getItemId()?

```ts
optional getItemId: (item) => string;
```

#### Parameters

##### item

`TItem`

#### Returns

`string`

---

### empty?

```ts
optional empty: ReactNode;
```

---

### perPageSizes?

```ts
optional perPageSizes: number[];
```

---

### defaultLayouts?

```ts
optional defaultLayouts: Record<string, unknown>;
```

---

### views?

```ts
optional views: ResourceDataViewSavedView[];
```

---

### screen?

```ts
optional screen: ResourceDataViewsScreenConfig;
```
