[**WP Kernel API v0.9.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / ResourceDataViewController

# Interface: ResourceDataViewController\&lt;TItem, TQuery\&gt;

## Type Parameters

### TItem

`TItem`

### TQuery

`TQuery`

## Properties

### resource?

```ts
readonly optional resource: ResourceObject<TItem, TQuery>;
```

---

### resourceName

```ts
readonly resourceName: string;
```

---

### config

```ts
readonly config: ResourceDataViewConfig<TItem, TQuery>;
```

---

### queryMapping

```ts
readonly queryMapping: QueryMapping<TQuery>;
```

---

### runtime

```ts
readonly runtime: DataViewsControllerRuntime;
```

---

### namespace

```ts
readonly namespace: string;
```

---

### preferencesKey

```ts
readonly preferencesKey: string;
```

---

### invalidate()?

```ts
readonly optional invalidate: (patterns) => void;
```

#### Parameters

##### patterns

[`CacheKeyPattern`](../../../core/src/type-aliases/CacheKeyPattern.md) | [`CacheKeyPattern`](../../../core/src/type-aliases/CacheKeyPattern.md)[]

#### Returns

`void`

---

### capabilities?

```ts
readonly optional capabilities: WPKUICapabilityRuntime;
```

---

### fetchList()?

```ts
readonly optional fetchList: (query) => Promise<ListResponse<TItem>>;
```

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\&lt;[`ListResponse`](../../../core/src/type-aliases/ListResponse.md)\&lt;`TItem`\&gt;\&gt;

---

### prefetchList()?

```ts
readonly optional prefetchList: (query) => Promise<void>;
```

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\&lt;`void`\&gt;

---

### mapViewToQuery()

```ts
mapViewToQuery: (view) => TQuery;
```

#### Parameters

##### view

`View`

#### Returns

`TQuery`

---

### deriveViewState()

```ts
deriveViewState: (view) => object;
```

#### Parameters

##### view

`View`

#### Returns

`object`

##### fields

```ts
fields: string[];
```

##### sort?

```ts
optional sort: object;
```

###### sort.field

```ts
field: string;
```

###### sort.direction

```ts
direction: 'asc' | 'desc';
```

##### search?

```ts
optional search: string;
```

##### filters?

```ts
optional filters: Record<string, unknown>;
```

##### page

```ts
page: number;
```

##### perPage

```ts
perPage: number;
```

---

### loadStoredView()

```ts
loadStoredView: () => Promise<View | undefined>;
```

#### Returns

`Promise`\&lt;`View` \| `undefined`\&gt;

---

### saveView()

```ts
saveView: (view) => Promise<void>;
```

#### Parameters

##### view

`View`

#### Returns

`Promise`\&lt;`void`\&gt;

---

### emitViewChange()

```ts
emitViewChange: (view) => void;
```

#### Parameters

##### view

`View`

#### Returns

`void`

---

### emitRegistered()

```ts
emitRegistered: (preferencesKey) => void;
```

#### Parameters

##### preferencesKey

`string`

#### Returns

`void`

---

### emitUnregistered()

```ts
emitUnregistered: (preferencesKey) => void;
```

#### Parameters

##### preferencesKey

`string`

#### Returns

`void`

---

### emitAction()

```ts
emitAction: (payload) => void;
```

#### Parameters

##### payload

###### actionId

`string`

###### selection

(`string` \| `number`)[]

###### permitted

`boolean`

###### reason?

`string`

###### meta?

`Record`\&lt;`string`, `unknown`\&gt;

#### Returns

`void`

---

### getReporter()

```ts
getReporter: () => Reporter;
```

#### Returns

[`Reporter`](../../../core/src/type-aliases/Reporter.md)
