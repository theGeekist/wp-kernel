[**@wpkernel/ui v0.11.0**](../README.md)

---

[@wpkernel/ui](../README.md) / ResourceDataViewController

# Interface: ResourceDataViewController\<TItem, TQuery\>

Controller for a ResourceDataView.

## Type Parameters

### TItem

`TItem`

### TQuery

`TQuery`

## Properties

### resourceName

```ts
readonly resourceName: string;
```

The name of the resource.

---

### config

```ts
readonly config: ResourceDataViewConfig<TItem, TQuery>;
```

The configuration for the DataView.

---

### queryMapping

```ts
readonly queryMapping: QueryMapping<TQuery>;
```

A function to map the view state to a query.

---

### runtime

```ts
readonly runtime: DataViewsControllerRuntime;
```

The runtime for the DataView controller.

---

### namespace

```ts
readonly namespace: string;
```

The namespace of the project.

---

### preferencesKey

```ts
readonly preferencesKey: string;
```

The key for storing preferences.

---

### mapViewToQuery()

```ts
mapViewToQuery: (view) => TQuery;
```

Maps the view state to a query.

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

Derives the view state from a view.

#### Parameters

##### view

`View`

#### Returns

`object`

##### fields

```ts
fields: string[];
```

##### page

```ts
page: number;
```

##### perPage

```ts
perPage: number;
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

---

### loadStoredView()

```ts
loadStoredView: () => Promise & lt;
View | (undefined & gt);
```

Loads the stored view from preferences.

#### Returns

`Promise`\<`View` \| `undefined`\>

---

### saveView()

```ts
saveView: (view) => Promise<void>;
```

Saves the view to preferences.

#### Parameters

##### view

`View`

#### Returns

`Promise`\<`void`\>

---

### emitViewChange()

```ts
emitViewChange: (view) => void;
```

Emits a view change event.

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

Emits a registered event.

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

Emits an unregistered event.

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

Emits an action event.

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

`Record`\<`string`, `unknown`\>

#### Returns

`void`

---

### getReporter()

```ts
getReporter: () => Reporter;
```

Gets the reporter for the controller.

#### Returns

`Reporter`

---

### resource?

```ts
readonly optional resource: ResourceObject<TItem, TQuery>;
```

The resource object.

---

### invalidate()?

```ts
readonly optional invalidate: (patterns) => void;
```

A function to invalidate cache entries.

#### Parameters

##### patterns

`CacheKeyPattern` | `CacheKeyPattern`[]

#### Returns

`void`

---

### capabilities?

```ts
readonly optional capabilities: WPKUICapabilityRuntime;
```

The capability runtime.

---

### fetchList()?

```ts
readonly optional fetchList: (query) => Promise<ListResponse<TItem>>;
```

A function to fetch a list of items.

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\<`ListResponse`\<`TItem`\>\>

---

### prefetchList()?

```ts
readonly optional prefetchList: (query) => Promise<void>;
```

A function to prefetch a list of items.

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\<`void`\>
