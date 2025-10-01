[**WP Kernel API v0.1.1**](../README.md)

---

[WP Kernel API](../README.md) / ResourceObject

# Interface: ResourceObject\<T, TQuery\>

Defined in: [types.ts:271](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L271)

Complete resource object returned by defineResource

Combines client methods, store key, cache key generators, and metadata.

## Example

```ts
const thing = defineResource<Thing, { q?: string }>({ ... });

// Use client methods
const items = await thing.list({ q: 'search' });
const item = await thing.get(123);

// Use in store selectors
const storeKey = thing.storeKey; // 'wpk/thing'

// Access @wordpress/data store (lazy-loaded, auto-registered)
const store = thing.store;
const item = select(store).getItem(123);

// Use cache keys for invalidation
invalidate(thing.cacheKeys.list({ q: 'search' }));
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

### list()?

```ts
optional list: (query?) => Promise<ListResponse<T>>;
```

Defined in: [types.ts:200](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L200)

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

[`ResourceClient`](ResourceClient.md).[`list`](ResourceClient.md#list)

---

### get()?

```ts
optional get: (id) => Promise<T>;
```

Defined in: [types.ts:210](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L210)

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

[`ResourceClient`](ResourceClient.md).[`get`](ResourceClient.md#get)

---

### create()?

```ts
optional create: (data) => Promise<T>;
```

Defined in: [types.ts:220](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L220)

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

Defined in: [types.ts:231](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L231)

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

Defined in: [types.ts:241](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L241)

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

Defined in: [types.ts:276](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L276)

Resource name

---

### storeKey

```ts
storeKey: string;
```

Defined in: [types.ts:283](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L283)

WordPress data store key (e.g., 'wpk/thing')

Used for store registration and selectors

---

### store

```ts
readonly store: unknown;
```

Defined in: [types.ts:297](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L297)

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

Defined in: [types.ts:304](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L304)

Cache key generators for all operations

Use these to generate cache keys for invalidation

---

### routes

```ts
routes: ResourceRoutes;
```

Defined in: [types.ts:309](https://github.com/theGeekist/wp-kernel/blob/main/packages/kernel/src/resource/types.ts#L309)

REST route definitions (normalized)
