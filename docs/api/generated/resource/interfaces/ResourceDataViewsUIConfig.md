[**WP Kernel API v0.4.0**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ResourceDataViewsUIConfig

# Interface: ResourceDataViewsUIConfig\<TItem, TQuery\>

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
optional fields: readonly Record<string, unknown>[];
```

---

### defaultView?

```ts
optional defaultView: Record<string, unknown>;
```

---

### actions?

```ts
optional actions: readonly Record<string, unknown>[];
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
