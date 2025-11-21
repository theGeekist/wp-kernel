[**@wpkernel/core v0.12.2-beta.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceDataViewsUIConfig

# Interface: ResourceDataViewsUIConfig<TItem, TQuery>

DataViews integration contract for a resource's admin UI.

Describes how `@wpkernel/ui` and generators should:

- map DataViews state into query objects,
- resolve item identities,
- expose saved views, layouts, and actions,
- and attach interactivity and screen metadata.

## Type Parameters

### TItem

`TItem` = `unknown`

Entity shape rendered in the view.

### TQuery

`TQuery` = `unknown`

Query shape produced by `mapQuery`.

## Indexable

```ts
[key: string]: unknown
```

Additional fields reserved for future extensions.

## Properties

### actions?

```ts
optional actions:
  | readonly Record<string, unknown>[]
  | Record<string, unknown>[];
```

Action descriptors (row and bulk actions).
The CLI and runtime use these to wire interactivity bindings.

---

### defaultLayouts?

```ts
optional defaultLayouts: Record<string, Record<string, unknown> | null | undefined>;
```

Per-layout defaults (e.g. table/grid) merged with user preferences.

---

### defaultView?

```ts
optional defaultView: Record<string, unknown>;
```

Default view configuration used when no preference is stored.

---

### empty?

```ts
optional empty: unknown;
```

Optional empty state configuration; forwarded to UI helpers.

---

### fields?

```ts
optional fields:
  | readonly Record<string, unknown>[]
  | Record<string, unknown>[];
```

Column/field descriptors forwarded to DataViews.

---

### getItemId()?

```ts
optional getItemId: (item) => string;
```

Extracts a stable identifier for rows rendered by the DataView.
Defaults to `item.id` when omitted.

#### Parameters

##### item

`TItem`

#### Returns

`string`

---

### interactivity?

```ts
optional interactivity: ResourceDataViewsInteractivityConfig;
```

Interactivity metadata used to derive namespaces and features.

---

### mapQuery()?

```ts
optional mapQuery: (viewState) => TQuery;
```

Maps DataViews state into the resource's query shape.
This function is the primary bridge between UI filters and REST queries.

#### Parameters

##### viewState

`Record`<`string`, `unknown`>

#### Returns

`TQuery`

---

### perPageSizes?

```ts
optional perPageSizes: readonly number[] | number[];
```

Page size options exposed in the DataView.

---

### preferencesKey?

```ts
optional preferencesKey: string;
```

Key used to persist user preferences for this DataView.

---

### screen?

```ts
optional screen: ResourceDataViewsScreenConfig;
```

Admin screen configuration for this DataView.

---

### search?

```ts
optional search: boolean;
```

Enables search UI and, optionally, customizes its label.

---

### searchLabel?

```ts
optional searchLabel: string;
```

---

### views?

```ts
optional views:
  | readonly ResourceDataViewsSavedViewConfig[]
  | ResourceDataViewsSavedViewConfig[];
```

Server-defined saved views available on first render.
