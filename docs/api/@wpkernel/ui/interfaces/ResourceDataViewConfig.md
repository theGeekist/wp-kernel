[**@wpkernel/ui v0.12.1-beta.2**](../README.md)

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

### defaultView

```ts
defaultView: View;
```

---

### fields

```ts
fields: Field < TItem > [];
```

---

### mapQuery

```ts
mapQuery: QueryMapping<TQuery>;
```

---

### actions?

```ts
optional actions: ResourceDataViewActionConfig<TItem, unknown, unknown>[];
```

---

### defaultLayouts?

```ts
optional defaultLayouts: Record<string, unknown>;
```

---

### empty?

```ts
optional empty: ReactNode;
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

### perPageSizes?

```ts
optional perPageSizes: number[];
```

---

### screen?

```ts
optional screen: ResourceDataViewsScreenConfig;
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

### views?

```ts
optional views: ResourceDataViewSavedView[];
```
