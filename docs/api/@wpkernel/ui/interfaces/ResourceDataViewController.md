[**@wpkernel/ui v0.12.2-beta.0**](../README.md)

---

[@wpkernel/ui](../README.md) / ResourceDataViewController

# Interface: ResourceDataViewController<TItem, TQuery>

Controller for a ResourceDataView.

## Type Parameters

### TItem

`TItem`

### TQuery

`TQuery`

## Properties

### config

```ts
readonly config: ResourceDataViewConfig<TItem, TQuery>;
```

The configuration for the DataView.

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

##### filters?

```ts
optional filters: Record<string, unknown>;
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

Emits an action event.

#### Parameters

##### payload

###### actionId

`string`

###### permitted

`boolean`

###### selection

(`string` \| `number`)[]

###### meta?

`Record`<`string`, `unknown`>

###### reason?

`string`

#### Returns

`void`

---

### emitBoundaryTransition()

```ts
emitBoundaryTransition: (payload) => void;
```

Emits a boundary transition event.

#### Parameters

##### payload

`Omit`<[`DataViewBoundaryTransitionPayload`](../type-aliases/DataViewBoundaryTransitionPayload.md), `"resource"`>

#### Returns

`void`

---

### emitFetchFailed()

```ts
emitFetchFailed: (payload) => void;
```

Emits a fetch failed event.

#### Parameters

##### payload

`Omit`<[`DataViewFetchFailedPayload`](../type-aliases/DataViewFetchFailedPayload.md), `"resource"`>

#### Returns

`void`

---

### emitPermissionDenied()

```ts
emitPermissionDenied: (payload) => void;
```

Emits a permission denied event.

#### Parameters

##### payload

`Omit`<[`DataViewPermissionDeniedPayload`](../type-aliases/DataViewPermissionDeniedPayload.md), `"resource"`>

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

### getReporter()

```ts
getReporter: () => Reporter;
```

Gets the reporter for the controller.

#### Returns

`Reporter`

---

### loadStoredView()

```ts
loadStoredView: () => Promise<View | undefined>;
```

Loads the stored view from preferences.

#### Returns

`Promise`<`View` \| `undefined`>

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

### queryMapping

```ts
readonly queryMapping: QueryMapping<TQuery>;
```

A function to map the view state to a query.

---

### resourceName

```ts
readonly resourceName: string;
```

The name of the resource.

---

### runtime

```ts
readonly runtime: DataViewsControllerRuntime;
```

The runtime for the DataView controller.

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

`Promise`<`void`>

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

`Promise`<`ListResponse`<`TItem`>>

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

### prefetchList()?

```ts
readonly optional prefetchList: (query) => Promise<void>;
```

A function to prefetch a list of items.

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`<`void`>

---

### resource?

```ts
readonly optional resource: ResourceObject<TItem, TQuery>;
```

The resource object.
