[**@wpkernel/core v0.11.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceDataViewsUIConfig

# Interface: ResourceDataViewsUIConfig\<TItem, TQuery\>

TODO: summary.

## Type Parameters

### TItem

`TItem` = `unknown`

— TODO

### TQuery

`TQuery` = `unknown`

— TODO

## Indexable

```ts
[key: string]: unknown
```

## Properties

### fields?

```ts
optional fields:
  | readonly Record<string, unknown>[]
  | Record<string, unknown>[];
```

---

### defaultView?

```ts
optional defaultView: Record<string, unknown>;
```

---

### actions?

```ts
optional actions:
  | readonly Record<string, unknown>[]
  | Record<string, unknown>[];
```

---

### mapQuery()?

```ts
optional mapQuery: (viewState) => TQuery;
```

#### Parameters

##### viewState

`Record`\<`string`, `unknown`\>

#### Returns

`TQuery`

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
optional empty: unknown;
```

---

### perPageSizes?

```ts
optional perPageSizes: readonly number[] | number[];
```

---

### defaultLayouts?

```ts
optional defaultLayouts: Record<string, Record<string, unknown> | null | undefined>;
```

---

### views?

```ts
optional views:
  | readonly ResourceDataViewsSavedViewConfig[]
  | ResourceDataViewsSavedViewConfig[];
```

---

### preferencesKey?

```ts
optional preferencesKey: string;
```

---

### screen?

```ts
optional screen: ResourceDataViewsScreenConfig;
```
