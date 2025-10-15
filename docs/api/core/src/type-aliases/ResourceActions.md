[**WP Kernel API v0.3.0**](../../../README.md)

---

[WP Kernel API](../../../README.md) / [core/src](../README.md) / ResourceActions

# Type Alias: ResourceActions\&lt;T\&gt;

```ts
type ResourceActions<T> = object & Record<string, AnyFn>;
```

Actions for a resource store.

## Type Declaration

### receiveItem()

```ts
receiveItem: (item) => void;
```

Receive a single item.

#### Parameters

##### item

`T`

The item to store

#### Returns

`void`

### receiveItems()

```ts
receiveItems: (queryKey, items, meta?) => void;
```

Receive multiple items from a list query.

#### Parameters

##### queryKey

`string`

Stringified query parameters

##### items

`T`[]

Array of items

##### meta?

List metadata (total, hasMore, nextCursor)

###### total?

`number`

###### hasMore?

`boolean`

###### nextCursor?

`string`

###### status?

`ResourceListStatus`

#### Returns

`void`

### receiveError()

```ts
receiveError: (cacheKey, error) => void;
```

Store an error for a given cache key.

#### Parameters

##### cacheKey

`string`

The cache key that failed

##### error

`string`

Error message

#### Returns

`void`

### invalidate()

```ts
invalidate: (cacheKeys) => void;
```

Clear cached data for specific cache keys.

#### Parameters

##### cacheKeys

`string`[]

Array of cache keys to invalidate

#### Returns

`void`

### invalidateAll()

```ts
invalidateAll: () => void;
```

Clear all cached data for this resource.

#### Returns

`void`

### setListStatus()

```ts
setListStatus: (queryKey, status) => void;
```

Update the status of a list query.

#### Parameters

##### queryKey

`string`

Stringified query parameters

##### status

`ResourceListStatus`

Loading status

#### Returns

`void`

## Type Parameters

### T

`T`

The resource entity type
