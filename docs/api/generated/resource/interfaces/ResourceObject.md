[**WP Kernel API v0.1.1**](../../README.md)

---

[WP Kernel API](../../README.md) / [resource](../README.md) / ResourceObject

# Interface: ResourceObject\<T, TQuery\>

Defined in: [resource/types.ts:299](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L299)

Complete resource object returned by defineResource

Combines client methods, store key, cache key generators, and metadata.
Provides both thin-flat API (direct methods) and grouped API (namespaces).

## Example

```ts
const thing = defineResource<Thing, { q?: string }>({ ... });

// Use client methods (thin-flat API)
const items = await thing.list({ q: 'search' });
const item = await thing.get(123);

// Use React hooks
const { data, isLoading } = thing.useGet(123);
const { data: items } = thing.useList({ q: 'search' });

// Prefetch data
await thing.prefetchGet(123);
await thing.prefetchList({ q: 'search' });

// Instance-based invalidation
thing.invalidate(['list']); // Invalidate all lists
thing.invalidate(['list', 'active']); // Invalidate specific query

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

Defined in: [resource/types.ts:215](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L215)

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

Defined in: [resource/types.ts:225](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L225)

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

Defined in: [resource/types.ts:235](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L235)

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

Defined in: [resource/types.ts:246](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L246)

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

Defined in: [resource/types.ts:256](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L256)

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

Defined in: [resource/types.ts:304](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L304)

Resource name

---

### storeKey

```ts
storeKey: string;
```

Defined in: [resource/types.ts:311](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L311)

WordPress data store key (e.g., 'my-plugin/thing')

Used for store registration and selectors

---

### store

```ts
readonly store: unknown;
```

Defined in: [resource/types.ts:325](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L325)

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

Defined in: [resource/types.ts:332](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L332)

Cache key generators for all operations

Use these to generate cache keys for invalidation

---

### routes

```ts
routes: ResourceRoutes;
```

Defined in: [resource/types.ts:337](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L337)

REST route definitions (normalized)

---

### useGet()?

```ts
optional useGet: (id) => object;
```

Defined in: [resource/types.ts:358](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L358)

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

Defined in: [resource/types.ts:382](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L382)

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

Defined in: [resource/types.ts:406](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L406)

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

Defined in: [resource/types.ts:425](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L425)

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

Defined in: [resource/types.ts:448](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L448)

Invalidate cached data for this resource

Instance method alternative to global `invalidate()` function.
Automatically scoped to this resource's store.

#### Parameters

##### patterns

(`undefined` \| `null` \| `string` \| `number` \| `boolean`)[][]

Cache key patterns to invalidate

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

Defined in: [resource/types.ts:470](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L470)

Generate a cache key for this resource

Useful for manual cache management or debugging.

#### Parameters

##### operation

Operation name ('list', 'get', etc.)

`"get"` | `"list"` | `"create"` | `"update"` | `"remove"`

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

Defined in: [resource/types.ts:482](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L482)

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

Defined in: [resource/types.ts:509](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L509)

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

Defined in: [resource/types.ts:535](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L535)

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

Defined in: [resource/types.ts:564](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L564)

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

Defined in: [resource/types.ts:586](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L586)

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

`"get"` | `"list"` | `"create"` | `"update"` | `"remove"`

###### params?

`string` | `number` | `TQuery` | `Partial`\<`T`\>

##### Returns

(`string` \| `number` \| `boolean`)[]

---

### storeApi

```ts
storeApi: object;
```

Defined in: [resource/types.ts:636](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L636)

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

Defined in: [resource/types.ts:653](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L653)

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
