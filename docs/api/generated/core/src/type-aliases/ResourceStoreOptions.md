[**WP Kernel API v0.7.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceStoreOptions

# Type Alias: ResourceStoreOptions\&lt;T, TQuery\&gt;

```ts
type ResourceStoreOptions<T, TQuery> = object;
```

Complete resource definition configuration

## Example

```ts
const thing = defineResource<Thing, { q?: string }>({
	name: 'thing',
	routes: {
		list: { path: '/my-plugin/v1/things', method: 'GET' },
		get: { path: '/my-plugin/v1/things/:id', method: 'GET' },
	},
	cacheKeys: {
		list: (q) => ['thing', 'list', q?.q],
		get: (id) => ['thing', 'get', id],
	},
	schema: import('./thing.schema.json'),
});
```

## Type Parameters

### T

`T`

The resource entity type (e.g., Thing)

### TQuery

`TQuery` = `unknown`

Query parameters type for list operations (e.g., { q?: string })

## Properties

### getId()?

```ts
optional getId: (item) => string | number;
```

Function to extract ID from an item.
Defaults to (item) =&gt; item.id

#### Parameters

##### item

`T`

#### Returns

`string` \| `number`

---

### getQueryKey()?

```ts
optional getQueryKey: (query?) => string;
```

Function to generate query key from query params.
Defaults to JSON.stringify

#### Parameters

##### query?

`TQuery`

#### Returns

`string`

---

### initialState?

```ts
optional initialState: Partial<ResourceState<T>>;
```

Initial state overrides for the store.
