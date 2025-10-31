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

### defaultView

```ts
defaultView: View;
```

---

### empty?

```ts
optional empty: ReactNode;
```

---

### fields

```ts
fields: Field < TItem > [];
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

### mapQuery

```ts
mapQuery: QueryMapping<TQuery>;
```

---

### perPageSizes?

```ts
optional perPageSizes: number[];
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
