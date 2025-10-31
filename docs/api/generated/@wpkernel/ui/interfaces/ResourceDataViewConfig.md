[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / ResourceDataViewConfig

# Interface: ResourceDataViewConfig\&lt;TItem, TQuery\&gt;

Resource DataView configuration.

## Type Parameters

### TItem

`TItem`

### TQuery

`TQuery`

## Properties

### fields

```ts
fields: Field < TItem > [];
```

---

### defaultView

```ts
defaultView: View;
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
