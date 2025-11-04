[**WP Kernel API v0.11.0**](../README.md)

***

[WP Kernel API](../README.md) / ResourceDataViewController

# Interface: ResourceDataViewController\&lt;TItem, TQuery\&gt;

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

***

### config

```ts
readonly config: ResourceDataViewConfig&lt;TItem, TQuery&gt;;
```

The configuration for the DataView.

***

### queryMapping

```ts
readonly queryMapping: QueryMapping&lt;TQuery&gt;;
```

A function to map the view state to a query.

***

### runtime

```ts
readonly runtime: DataViewsControllerRuntime;
```

The runtime for the DataView controller.

***

### namespace

```ts
readonly namespace: string;
```

The namespace of the project.

***

### preferencesKey

```ts
readonly preferencesKey: string;
```

The key for storing preferences.

***

### mapViewToQuery()

```ts
mapViewToQuery: (view) =&gt; TQuery;
```

Maps the view state to a query.

#### Parameters

##### view

`View`

#### Returns

`TQuery`

***

### deriveViewState()

```ts
deriveViewState: (view) =&gt; object;
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
direction: "asc" | "desc";
```

##### search?

```ts
optional search: string;
```

##### filters?

```ts
optional filters: Record&lt;string, unknown&gt;;
```

***

### loadStoredView()

```ts
loadStoredView: () =&gt; Promise&lt;View | undefined&gt;;
```

Loads the stored view from preferences.

#### Returns

`Promise`\&lt;`View` \| `undefined`\&gt;

***

### saveView()

```ts
saveView: (view) =&gt; Promise&lt;void&gt;;
```

Saves the view to preferences.

#### Parameters

##### view

`View`

#### Returns

`Promise`\&lt;`void`\&gt;

***

### emitViewChange()

```ts
emitViewChange: (view) =&gt; void;
```

Emits a view change event.

#### Parameters

##### view

`View`

#### Returns

`void`

***

### emitRegistered()

```ts
emitRegistered: (preferencesKey) =&gt; void;
```

Emits a registered event.

#### Parameters

##### preferencesKey

`string`

#### Returns

`void`

***

### emitUnregistered()

```ts
emitUnregistered: (preferencesKey) =&gt; void;
```

Emits an unregistered event.

#### Parameters

##### preferencesKey

`string`

#### Returns

`void`

***

### emitAction()

```ts
emitAction: (payload) =&gt; void;
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

`Record`\&lt;`string`, `unknown`\&gt;

#### Returns

`void`

***

### getReporter()

```ts
getReporter: () =&gt; Reporter;
```

Gets the reporter for the controller.

#### Returns

`Reporter`

***

### resource?

```ts
readonly optional resource: ResourceObject&lt;TItem, TQuery&gt;;
```

The resource object.

***

### invalidate()?

```ts
readonly optional invalidate: (patterns) =&gt; void;
```

A function to invalidate cache entries.

#### Parameters

##### patterns

`CacheKeyPattern` | `CacheKeyPattern`[]

#### Returns

`void`

***

### capabilities?

```ts
readonly optional capabilities: WPKUICapabilityRuntime;
```

The capability runtime.

***

### fetchList()?

```ts
readonly optional fetchList: (query) =&gt; Promise&lt;ListResponse&lt;TItem&gt;&gt;;
```

A function to fetch a list of items.

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\&lt;`ListResponse`\&lt;`TItem`\&gt;\&gt;

***

### prefetchList()?

```ts
readonly optional prefetchList: (query) =&gt; Promise&lt;void&gt;;
```

A function to prefetch a list of items.

#### Parameters

##### query

`TQuery`

#### Returns

`Promise`\&lt;`void`\&gt;
