[**WP Kernel API v0.10.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [@wpkernel/ui](../README.md) / ResourceDataViewController

# Interface: ResourceDataViewController\&lt;TItem, TQuery\&gt;

## Type Parameters

### TItem

`TItem`

### TQuery

`TQuery`

## Properties

### capabilities?

```ts
readonly optional capabilities: WPKUICapabilityRuntime;
```

---

### config

```ts
readonly config: ResourceDataViewConfig<TItem, TQuery>;
```

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

##### search?

```ts
optional search: string;
```

##### sort?

```ts
optional sort: object;
```

###### sort.direction

```ts
direction: 'asc' | 'desc';
```

###### sort.field

```ts
field: string;
```

---

### emitAction()

```ts
emitAction: (payload) => void;
```

#### Parameters

##### payload

###### actionId

`string`

###### meta?

`Record`\&lt;`string`, `unknown`\&gt;

###### permitted

`boolean`

###### reason?

`string`

###### selection

(`string` \| `number`)[]

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

### getReporter()

```ts
getReporter: () => Reporter;
```

#### Returns

[`Reporter`](../../../core/src/type-aliases/Reporter.md)

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

### loadStoredView()

```ts
loadStoredView: () => Promise<View | undefined>;
```

#### Returns

`Promise`\&lt;`View` \| `undefined`\&gt;

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

### queryMapping

```ts
readonly queryMapping: QueryMapping<TQuery>;
```

---

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

### runtime

```ts
readonly runtime: DataViewsControllerRuntime;
```

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
