[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ResourceObject

# Interface: ResourceObject\<T, TQuery\>

Defined in: [resource/types.ts:300](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L300)

Complete resource object returned by defineResource

Combines client methods, store key, cache key generators, and metadata.
Provides both thin-flat API (direct methods) and grouped API (namespaces).

## Example

```ts
const thing = defineResource<Thing, { q?: string }>({ ... });

// Use client methods (thin-flat API)
const items = await thing.fetchList({ q: 'search' });
const item = await thing.fetch(123);

// Use React hooks
const { data, isLoading } = thing.useGet(123);
const { data: items } = thing.useList({ q: 'search' });

// Prefetch data
await thing.prefetchGet(123);
await thing.prefetchList({ q: 'search' });

// Instance-based invalidation (include resource name as first segment)
thing.invalidate(['thing', 'list']); // Invalidate all lists
thing.invalidate(['thing', 'list', 'active']); // Invalidate specific query

// Generate cache keys
const key = thing.key('list', { q: 'search' });

// Use in store selectors
const storeKey = thing.storeKey; // 'my-plugin/thing'

// Access @wordpress/data store (lazy-loaded, auto-registered)
const store = thing.store;
const item = select(store).getItem(123);
```

## Extends

- [`ResourceClient`](ResourceClient.md)\<`T`, `TQuery`\>

## Type Parameters

### T

`T` = `unknown`

The resource entity type

### TQuery

`TQuery` = `unknown`

Query parameters type for list operations

## Properties

### fetchList()?

```ts
optional fetchList: (query?) => Promise<ListResponse<T>>;
```

Defined in: [resource/types.ts:216](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L216)

Fetch a list of resources

#### Parameters

##### query?

`TQuery`

Query parameters (filters, pagination, etc.)

#### Returns

`Promise`\<[`ListResponse`](ListResponse.md)\<`T`\>\>

Promise resolving to list response

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error

#### Inherited from

[`ResourceClient`](ResourceClient.md).[`fetchList`](ResourceClient.md#fetchlist)

---

### fetch()?

```ts
optional fetch: (id) => Promise<T>;
```

Defined in: [resource/types.ts:226](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L226)

Fetch a single resource by ID

#### Parameters

##### id

Resource identifier

`string` | `number`

#### Returns

`Promise`\<`T`\>

Promise resolving to resource entity

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error (including 404)

#### Inherited from

[`ResourceClient`](ResourceClient.md).[`fetch`](ResourceClient.md#fetch)

---

### create()?

```ts
optional create: (data) => Promise<T>;
```

Defined in: [resource/types.ts:236](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L236)

Create a new resource

#### Parameters

##### data

`Partial`\<`T`\>

Resource data to create

#### Returns

`Promise`\<`T`\>

Promise resolving to created resource

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error (including validation errors)

#### Inherited from

[`ResourceClient`](ResourceClient.md).[`create`](ResourceClient.md#create)

---

### update()?

```ts
optional update: (id, data) => Promise<T>;
```

Defined in: [resource/types.ts:247](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L247)

Update an existing resource

#### Parameters

##### id

Resource identifier

`string` | `number`

##### data

`Partial`\<`T`\>

Partial resource data to update

#### Returns

`Promise`\<`T`\>

Promise resolving to updated resource

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error (including 404, validation errors)

#### Inherited from

[`ResourceClient`](ResourceClient.md).[`update`](ResourceClient.md#update)

---

### remove()?

```ts
optional remove: (id) => Promise<void | T>;
```

Defined in: [resource/types.ts:257](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L257)

Delete a resource

#### Parameters

##### id

Resource identifier

`string` | `number`

#### Returns

`Promise`\<`void` \| `T`\>

Promise resolving to void or deleted resource

#### Throws

TransportError on network failure

#### Throws

ServerError on REST API error (including 404)

#### Inherited from

[`ResourceClient`](ResourceClient.md).[`remove`](ResourceClient.md#remove)

---

### name

```ts
name: string;
```

Defined in: [resource/types.ts:305](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L305)

Resource name

---

### storeKey

```ts
storeKey: string;
```

Defined in: [resource/types.ts:312](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L312)

WordPress data store key (e.g., 'my-plugin/thing')

Used for store registration and selectors

---

### store

```ts
readonly store: unknown;
```

Defined in: [resource/types.ts:326](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L326)

Lazy-loaded @wordpress/data store

Automatically registered on first access.
Returns the store descriptor compatible with select/dispatch.

#### Example

```ts
import { select } from '@wordpress/data';
const item = select(thing.store).getItem(123);
```

---

### cacheKeys

```ts
cacheKeys: Required<CacheKeys>;
```

Defined in: [resource/types.ts:333](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L333)

Cache key generators for all operations

Use these to generate cache keys for invalidation

---

### routes

```ts
routes: ResourceRoutes;
```

Defined in: [resource/types.ts:338](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L338)

REST route definitions (normalized)

---

### useGet()?

```ts
optional useGet: (id) => object;
```

Defined in: [resource/types.ts:359](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L359)

React hook to fetch a single item

Uses @wordpress/data's useSelect under the hood.
Automatically handles loading states and re-fetching.

#### Parameters

##### id

Item identifier

`string` | `number`

#### Returns

`object`

Hook result with data, isLoading, error

##### data

```ts
data: undefined | T;
```

##### isLoading

```ts
isLoading: boolean;
```

##### error

```ts
error: undefined | string;
```

#### Example

```ts
function ThingView({ id }: { id: number }) {
  const { data: thing, isLoading } = thing.useGet(id);
  if (isLoading) return <Spinner />;
  return <div>{thing.title}</div>;
}
```

---

### useList()?

```ts
optional useList: (query?) => object;
```

Defined in: [resource/types.ts:383](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L383)

React hook to fetch a list of items

Uses @wordpress/data's useSelect under the hood.
Automatically handles loading states and re-fetching.

#### Parameters

##### query?

`TQuery`

Query parameters

#### Returns

`object`

Hook result with data, isLoading, error

##### data

```ts
data: undefined | ListResponse<T>;
```

##### isLoading

```ts
isLoading: boolean;
```

##### error

```ts
error: undefined | string;
```

#### Example

```ts
function ThingList({ status }: { status: string }) {
  const { data, isLoading } = thing.useList({ status });
  if (isLoading) return <Spinner />;
  return <List items={data?.items} />;
}
```

---

### prefetchGet()?

```ts
optional prefetchGet: (id) => Promise<void>;
```

Defined in: [resource/types.ts:407](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L407)

Prefetch a single item into the cache

Useful for optimistic loading or preloading data before navigation.
Does not return the data, only ensures it's in the cache.

#### Parameters

##### id

Item identifier

`string` | `number`

#### Returns

`Promise`\<`void`\>

Promise resolving when prefetch completes

#### Example

```ts
// Prefetch on hover
<Link onMouseEnter={() => thing.prefetchGet(123)}>
  View Thing
</Link>
```

---

### prefetchList()?

```ts
optional prefetchList: (query?) => Promise<void>;
```

Defined in: [resource/types.ts:426](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L426)

Prefetch a list of items into the cache

Useful for optimistic loading or preloading data before navigation.
Does not return the data, only ensures it's in the cache.

#### Parameters

##### query?

`TQuery`

Query parameters

#### Returns

`Promise`\<`void`\>

Promise resolving when prefetch completes

#### Example

```ts
// Prefetch on app mount
useEffect(() => {
	thing.prefetchList({ status: 'active' });
}, []);
```

---

### invalidate()

```ts
invalidate: (patterns) => void;
```

Defined in: [resource/types.ts:449](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L449)

Invalidate cached data for this resource

Instance method alternative to global `invalidate()` function.
Automatically scoped to this resource's store.

#### Parameters

##### patterns

Cache key patterns to invalidate

[`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md) | [`CacheKeyPattern`](../type-aliases/CacheKeyPattern.md)[]

#### Returns

`void`

#### Example

```ts
// After creating a thing
await thing.create(data);
thing.invalidate(['list']); // Invalidate all lists

// After updating
await thing.update(id, data);
thing.invalidate(['get', id]); // Invalidate specific item
thing.invalidate(['list']); // Also invalidate lists
```

---

### key()

```ts
key: (operation, params?) => (string | number | boolean)[];
```

Defined in: [resource/types.ts:469](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L469)

Generate a cache key for this resource

Useful for manual cache management or debugging.

#### Parameters

##### operation

Operation name ('list', 'get', etc.)

`"list"` | `"get"` | `"create"` | `"update"` | `"remove"`

##### params?

Parameters for the operation

`string` | `number` | `TQuery` | `Partial`\<`T`\>

#### Returns

(`string` \| `number` \| `boolean`)[]

Cache key array

#### Example

```ts
const key = thing.key('list', { status: 'active' });
// => ['thing', 'list', '{"status":"active"}']

const key2 = thing.key('get', 123);
// => ['thing', 'get', 123]
```

---

### select?

```ts
optional select: object;
```

Defined in: [resource/types.ts:481](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L481)

Grouped API: Pure selectors (no fetching)

Access cached data without triggering network requests.
Ideal for computed values and derived state.

#### item()

```ts
item: (id) => undefined | T;
```

Get cached item by ID (no fetch)

##### Parameters

###### id

Item identifier

`string` | `number`

##### Returns

`undefined` \| `T`

Cached item or undefined

#### items()

```ts
items: () => T[];
```

Get all cached items (no fetch)

##### Returns

`T`[]

Array of all cached items

#### list()

```ts
list: (query?) => T[];
```

Get cached list by query (no fetch)

##### Parameters

###### query?

`TQuery`

Query parameters

##### Returns

`T`[]

Array of items matching query or empty array

---

### use?

```ts
optional use: object;
```

Defined in: [resource/types.ts:508](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L508)

Grouped API: React hooks

Convenience wrappers around useGet/useList for the grouped API.

#### item()

```ts
item: (id) => object;
```

React hook to fetch and watch a single item

##### Parameters

###### id

`string` | `number`

##### Returns

`object`

###### data

```ts
data: undefined | T;
```

###### isLoading

```ts
isLoading: boolean;
```

###### error

```ts
error: undefined | string;
```

#### list()

```ts
list: (query?) => object;
```

React hook to fetch and watch a list

##### Parameters

###### query?

`TQuery`

##### Returns

`object`

###### data

```ts
data: undefined | ListResponse<T>;
```

###### isLoading

```ts
isLoading: boolean;
```

###### error

```ts
error: undefined | string;
```

---

### get?

```ts
optional get: object;
```

Defined in: [resource/types.ts:534](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L534)

Grouped API: Explicit data fetching (bypass cache)

Direct network calls that always hit the server.
Useful for refresh actions or real-time data requirements.

#### item()

```ts
item: (id) => Promise<T>;
```

Get item from server (bypass cache)

Always fetches fresh data from the server, ignoring cache.
Use for explicit refresh actions or real-time requirements.

##### Parameters

###### id

Item identifier

`string` | `number`

##### Returns

`Promise`\<`T`\>

Promise resolving to the item

#### list()

```ts
list: (query?) => Promise<ListResponse<T>>;
```

Get list from server (bypass cache)

Always fetches fresh data from the server, ignoring cache.
Use for explicit refresh actions or real-time requirements.

##### Parameters

###### query?

`TQuery`

Optional query parameters

##### Returns

`Promise`\<[`ListResponse`](ListResponse.md)\<`T`\>\>

Promise resolving to list response

---

### mutate?

```ts
optional mutate: object;
```

Defined in: [resource/types.ts:563](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L563)

Grouped API: Mutations (CRUD operations)

Write operations that modify server state.

#### create()

```ts
create: (data) => Promise<T>;
```

Create new item

##### Parameters

###### data

`Partial`\<`T`\>

##### Returns

`Promise`\<`T`\>

#### update()

```ts
update: (id, data) => Promise<T>;
```

Update existing item

##### Parameters

###### id

`string` | `number`

###### data

`Partial`\<`T`\>

##### Returns

`Promise`\<`T`\>

#### remove()

```ts
remove: (id) => Promise<void>;
```

Delete item

##### Parameters

###### id

`string` | `number`

##### Returns

`Promise`\<`void`\>

---

### cache

```ts
cache: object;
```

Defined in: [resource/types.ts:585](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L585)

Grouped API: Cache control

Fine-grained cache management operations.

#### prefetch

```ts
prefetch: object;
```

Prefetch operations (eager loading)

##### prefetch.item()

```ts
item: (id) => Promise<void>;
```

Prefetch single item into cache

###### Parameters

###### id

`string` | `number`

###### Returns

`Promise`\<`void`\>

##### prefetch.list()

```ts
list: (query?) => Promise<void>;
```

Prefetch list into cache

###### Parameters

###### query?

`TQuery`

###### Returns

`Promise`\<`void`\>

#### invalidate

```ts
invalidate: object;
```

Cache invalidation operations

##### invalidate.item()

```ts
item: (id) => void;
```

Invalidate cached item by ID

###### Parameters

###### id

`string` | `number`

###### Returns

`void`

##### invalidate.list()

```ts
list: (query?) => void;
```

Invalidate cached list by query

###### Parameters

###### query?

`TQuery`

###### Returns

`void`

##### invalidate.all()

```ts
all: () => void;
```

Invalidate all cached data for this resource

###### Returns

`void`

#### key()

```ts
key: (operation, params?) => (string | number | boolean)[];
```

Generate cache key

##### Parameters

###### operation

`"list"` | `"get"` | `"create"` | `"update"` | `"remove"`

###### params?

`string` | `number` | `TQuery` | `Partial`\<`T`\>

##### Returns

(`string` \| `number` \| `boolean`)[]

---

### storeApi

```ts
storeApi: object;
```

Defined in: [resource/types.ts:635](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L635)

Grouped API: Store access

Direct access to @wordpress/data store internals.

#### key

```ts
key: string;
```

Store key for @wordpress/data

#### descriptor

```ts
descriptor: unknown;
```

Store descriptor (lazy-loaded)

---

### events?

```ts
optional events: object;
```

Defined in: [resource/types.ts:652](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L652)

Grouped API: Event names

Canonical event names for this resource.

#### created

```ts
created: string;
```

Fired when item is created

#### updated

```ts
updated: string;
```

Fired when item is updated

#### removed

```ts
removed: string;
```

Fired when item is removed
