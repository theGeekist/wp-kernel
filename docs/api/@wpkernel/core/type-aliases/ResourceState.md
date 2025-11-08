[**@wpkernel/core v0.12.0**](../README.md)

---

[@wpkernel/core](../README.md) / ResourceState

# Type Alias: ResourceState\<T\>

```ts
type ResourceState<T> = object;
```

Normalized state shape for a resource store.

Tracks items, list mappings, list metadata, and per-key errors in a form
consumable by `@wordpress/data` selectors and resolvers.

## Type Parameters

### T

`T`

Entity shape stored in the resource.

## Properties

### items

```ts
items: Record & lt;
(string | number, T & gt);
```

Map of items by ID.

---

### lists

```ts
lists: Record<string, (string | number)[]>;
```

List queries and their results.
Key is stringified query params, value is array of IDs.

---

### listMeta

```ts
listMeta: Record<
	string,
	{
		total?: number;
		hasMore?: boolean;
		nextCursor?: string;
		status?: ResourceListStatus;
	}
>;
```

List metadata (total count, pagination, etc).

---

### errors

```ts
errors: Record & lt;
(string, string & gt);
```

Error messages by cache key.
