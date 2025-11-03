[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceDataViewsUIConfig

# Interface: ResourceDataViewsUIConfig\&lt;TItem, TQuery\&gt;

## Type Parameters

### TItem

`TItem` = `unknown`

### TQuery

`TQuery` = `unknown`

## Indexable

```ts
[key: string]: unknown
```

## Properties

### actions?

```ts
optional actions: unknown[];
```

---

### defaultLayouts?

```ts
optional defaultLayouts: Record<string, unknown>;
```

---

### defaultView?

```ts
optional defaultView: unknown;
```

---

### empty?

```ts
optional empty: unknown;
```

---

### fields?

```ts
optional fields: unknown[] | readonly unknown[];
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

### mapQuery()?

```ts
optional mapQuery: (viewState) => TQuery;
```

#### Parameters

##### viewState

`Record`\&lt;`string`, `unknown`\&gt;

#### Returns

`TQuery`

---

### perPageSizes?

```ts
optional perPageSizes: number[];
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
