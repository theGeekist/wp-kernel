[**WP Kernel API v0.9.0**](../../../README.md)

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

### fields?

```ts
optional fields: unknown[] | readonly unknown[];
```

---

### defaultView?

```ts
optional defaultView: unknown;
```

---

### actions?

```ts
optional actions: unknown[];
```

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
optional perPageSizes: number[];
```

---

### defaultLayouts?

```ts
optional defaultLayouts: Record<string, unknown>;
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
